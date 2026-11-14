import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { adminAuth } from '../lib/firebase-admin.ts';
import { verifySessionToken } from '../lib/auth-crypto.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';

export type UserRole =
  | 'super_admin'
  | 'business_manager'
  | 'sales_staff'
  | 'inventory_manager'
  | 'customer';

export const STAFF_ROLES: UserRole[] = [
  'super_admin',
  'business_manager',
  'sales_staff',
  'inventory_manager',
];

export interface AppUserRecord {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  businessName: string;
  deliveryAddress: string;
  district: string;
  role: UserRole;
  isActive: boolean;
}

export interface AuthRequest extends Request {
  appUser?: AppUserRecord;
}

async function upsertFirebaseUser(
  uid: string,
  email: string,
  fullName: string
): Promise<AppUserRecord> {
  const existingByUid = await db
    .select()
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);

  if (existingByUid.length > 0) {
    const u = existingByUid[0];
    return {
      id: u.id,
      uid: u.uid,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      businessName: u.businessName,
      deliveryAddress: u.deliveryAddress,
      district: u.district,
      role: u.role as UserRole,
      isActive: u.isActive,
    };
  }

  // Check if a user with this email exists (e.g. registered locally first)
  const existingByEmail = email
    ? await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1)
    : [];

  if (existingByEmail.length > 0) {
    const u = existingByEmail[0];
    return {
      id: u.id,
      uid: u.uid,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      businessName: u.businessName,
      deliveryAddress: u.deliveryAddress,
      district: u.district,
      role: u.role as UserRole,
      isActive: u.isActive,
    };
  }

  const inserted = await db
    .insert(users)
    .values({
      uid,
      email: email.toLowerCase(),
      fullName: fullName || '',
      role: 'customer',
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email: email.toLowerCase(),
        updatedAt: new Date(),
      },
    })
    .returning();

  const u = inserted[0];
  return {
    id: u.id,
    uid: u.uid,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    businessName: u.businessName,
    deliveryAddress: u.deliveryAddress,
    district: u.district,
    role: u.role as UserRole,
    isActive: u.isActive,
  };
}

async function resolveUserFromToken(token: string): Promise<AppUserRecord | null> {
  // 1. Check local HMAC session token
  if (token.startsWith('emp_')) {
    const payload = verifySessionToken(token);
    if (!payload) return null;
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);
    if (!rows.length || !rows[0].isActive) return null;
    const u = rows[0];
    return {
      id: u.id,
      uid: u.uid,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      businessName: u.businessName,
      deliveryAddress: u.deliveryAddress,
      district: u.district,
      role: u.role as UserRole,
      isActive: u.isActive,
    };
  }

  // 2. Verify Firebase ID Token
  const decoded = await adminAuth.verifyIdToken(token);
  const user = await upsertFirebaseUser(
    decoded.uid,
    decoded.email || '',
    typeof decoded.name === 'string' ? decoded.name : ''
  );
  if (!user.isActive) return null;
  return user;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const user = await resolveUserFromToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or inactive session' });
    }
    req.appUser = user;
    next();
  } catch (err) {
    console.error('Auth verification failed:', err);
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    try {
      const user = await resolveUserFromToken(token);
      if (user) {
        req.appUser = user;
      }
    } catch {
      // Proceed as guest
    }
  }
  next();
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.appUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.appUser.role)) {
      return res.status(403).json({
        error: 'You do not have permission to perform this action',
      });
    }
    next();
  };
};
