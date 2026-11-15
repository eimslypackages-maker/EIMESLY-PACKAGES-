import crypto from 'node:crypto';
import { Router } from 'express';
import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { orderItems, orders, quotations, users } from '../../db/schema.ts';
import {
  hashPassword,
  signSessionToken,
  verifyPassword,
} from '../../lib/auth-crypto.ts';
import { type AuthRequest, requireAuth, STAFF_ROLES } from '../../middleware/auth.ts';
import { recordAuditLog } from '../audit.ts';

export const authRouter = Router();

const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const loginAttempts = new Map<string, number[]>();

function getRateLimitKey(req: AuthRequest, email: string): string {
  const ip =
    (typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
      : req.ip) || 'unknown';
  return `${ip}:${email}`;
}

function isRateLimited(key: string): { limited: boolean; retryAfterSec: number } {
  const now = Date.now();
  const recent = (loginAttempts.get(key) || []).filter(
    (ts) => now - ts < LOGIN_RATE_WINDOW_MS
  );
  if (recent.length > 0) {
    loginAttempts.set(key, recent);
  } else {
    loginAttempts.delete(key);
  }
  if (recent.length >= LOGIN_MAX_ATTEMPTS) {
    const oldest = recent[0];
    const retryAfterSec = Math.max(
      1,
      Math.ceil((LOGIN_RATE_WINDOW_MS - (now - oldest)) / 1000)
    );
    return { limited: true, retryAfterSec };
  }
  return { limited: false, retryAfterSec: 0 };
}

function recordFailedAttempt(key: string) {
  const now = Date.now();
  const recent = (loginAttempts.get(key) || []).filter(
    (ts) => now - ts < LOGIN_RATE_WINDOW_MS
  );
  recent.push(now);
  loginAttempts.set(key, recent);
}

function clearFailedAttempts(key: string) {
  loginAttempts.delete(key);
}

authRouter.get('/setup-status', async (_req, res) => {
  try {
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'super_admin'))
      .limit(1);
    res.json({ hasSuperAdmin: admins.length > 0 });
  } catch (err) {
    console.error('Setup status error:', err);
    res.status(500).json({ error: 'Unable to check setup status' });
  }
});

authRouter.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: req.appUser });
});

authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, phone, businessName } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }
    if (!password || String(password).length < 8) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters long' });
    }

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (existing.length > 0) {
      return res
        .status(409)
        .json({ error: 'An account with this email already exists' });
    }

    const uid = `local_${crypto.randomUUID()}`;
    const passwordHash = hashPassword(String(password));

    const [created] = await db
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        passwordHash,
        fullName: String(fullName || '').trim(),
        phone: String(phone || '').trim(),
        businessName: String(businessName || '').trim(),
        role: 'customer',
        isActive: true,
      })
      .returning();

    const token = signSessionToken({
      uid: created.uid,
      userId: created.id,
      email: created.email,
    });

    res.status(201).json({
      token,
      user: {
        id: created.id,
        uid: created.uid,
        email: created.email,
        fullName: created.fullName,
        phone: created.phone,
        businessName: created.businessName,
        deliveryAddress: created.deliveryAddress,
        district: created.district,
        role: created.role,
        isActive: created.isActive,
      },
    });
  } catch (err) {
    console.error('Register failed:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

authRouter.post('/login', async (req: AuthRequest, res) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const rateKey = getRateLimitKey(req, cleanEmail);
    const rateCheck = isRateLimited(rateKey);
    if (rateCheck.limited) {
      await recordAuditLog({
        action: 'rate_limited_login',
        entityType: 'auth',
        entityId: cleanEmail,
        details: { retryAfterSec: rateCheck.retryAfterSec },
      });
      return res.status(429).json({
        error: `Too many failed sign-in attempts. Please wait ${Math.ceil(rateCheck.retryAfterSec / 60)} minute(s) before trying again.`,
      });
    }

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    const storedHash = rows[0]?.passwordHash;
    if (rows.length === 0) {
      recordFailedAttempt(rateKey);
      await recordAuditLog({
        action: 'failed_login',
        entityType: 'auth',
        entityId: cleanEmail,
        details: { reason: 'account_not_found' },
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!storedHash) {
      const isStaff = STAFF_ROLES.includes(
        rows[0].role as (typeof STAFF_ROLES)[number]
      );
      if (isStaff) {
        return res.status(400).json({
          error:
            'This admin account signs in with Google and does not have a password set yet. Use "Sign In with Google" on this page to access Admin Control.',
        });
      }
      recordFailedAttempt(rateKey);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    if (!user.isActive) {
      await recordAuditLog({
        action: 'failed_login',
        entityType: 'auth',
        entityId: cleanEmail,
        details: { reason: 'account_deactivated' },
      });
      return res
        .status(403)
        .json({ error: 'This account has been deactivated' });
    }

    if (!verifyPassword(String(password), storedHash)) {
      recordFailedAttempt(rateKey);
      await recordAuditLog({
        action: 'failed_login',
        entityType: 'auth',
        entityId: cleanEmail,
        details: { reason: 'invalid_password' },
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    clearFailedAttempts(rateKey);
    const token = signSessionToken({
      uid: user.uid,
      userId: user.id,
      email: user.email,
    });

    await recordAuditLog({
      actor: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        businessName: user.businessName,
        deliveryAddress: user.deliveryAddress,
        district: user.district,
        role: user.role as AuthRequest['appUser'] extends infer U
          ? U extends { role: infer R }
            ? R
            : never
          : never,
        isActive: user.isActive,
      },
      action: 'login_success',
      entityType: 'auth',
      entityId: user.email,
      details: { role: user.role },
    });

    res.json({
      token,
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        businessName: user.businessName,
        deliveryAddress: user.deliveryAddress,
        district: user.district,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ error: 'Sign in failed' });
  }
});

authRouter.post('/forgot-password', async (req, res) => {
  try {
    const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (rows.length > 0 && rows[0].passwordHash) {
      const resetToken = crypto.randomBytes(24).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
      await db
        .update(users)
        .set({ resetToken, resetTokenExpires })
        .where(eq(users.id, rows[0].id));
    }

    res.json({
      message:
        'If an email/password account exists for that address, a reset request has been logged. Please check with our support team or use Google Sign-In if your account is linked to Google.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Unable to process password reset request' });
  }
});

authRouter.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword || String(newPassword).length < 8) {
      return res
        .status(400)
        .json({ error: 'Valid reset token and 8+ character password required' });
    }
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.resetToken, String(token)))
      .limit(1);

    if (
      rows.length === 0 ||
      !rows[0].resetTokenExpires ||
      new Date(rows[0].resetTokenExpires) < new Date()
    ) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    await db
      .update(users)
      .set({
        passwordHash: hashPassword(String(newPassword)),
        resetToken: null,
        resetTokenExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, rows[0].id));

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Unable to reset password' });
  }
});

authRouter.post('/set-password', requireAuth, async (req: AuthRequest, res) => {
  try {
    const newPassword = String(req.body?.newPassword || '');
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters long' });
    }
    await db
      .update(users)
      .set({
        passwordHash: hashPassword(newPassword),
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.appUser!.id));

    await recordAuditLog({
      actor: req.appUser,
      action: 'set_account_password',
      entityType: 'user',
      entityId: req.appUser!.id,
    });

    res.json({ message: 'Backup password saved. You can now sign in with email and password or Google.' });
  } catch (err) {
    console.error('Set password error:', err);
    res.status(500).json({ error: 'Unable to save password' });
  }
});

// One-time initial Super Admin bootstrap (only succeeds when 0 super_admins exist)
authRouter.post('/bootstrap-super-admin', async (req, res) => {
  try {
    const existingAdmins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'super_admin'))
      .limit(1);

    if (existingAdmins.length > 0) {
      return res.status(403).json({
        error: 'A Super Admin account already exists. Please sign in normally.',
      });
    }

    // Either upgrade currently authenticated user or create initial Super Admin account
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Delegate through requireAuth semantics by reusing /claim-initial-admin
      return res.status(400).json({ error: 'Use /claim-initial-admin when signed in' });
    }

    const { email, password, fullName } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    if (!password || String(password).length < 8) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters' });
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    let adminUser;
    if (existingUser.length > 0) {
      const [updated] = await db
        .update(users)
        .set({
          role: 'super_admin',
          passwordHash: hashPassword(String(password)),
          fullName: String(fullName || existingUser[0].fullName).trim(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser[0].id))
        .returning();
      adminUser = updated;
    } else {
      const [created] = await db
        .insert(users)
        .values({
          uid: `local_${crypto.randomUUID()}`,
          email: cleanEmail,
          passwordHash: hashPassword(String(password)),
          fullName: String(fullName || 'Administrator').trim(),
          role: 'super_admin',
          isActive: true,
        })
        .returning();
      adminUser = created;
    }

    await recordAuditLog({
      actor: {
        id: adminUser.id,
        uid: adminUser.uid,
        email: adminUser.email,
        fullName: adminUser.fullName,
        phone: adminUser.phone,
        businessName: adminUser.businessName,
        deliveryAddress: adminUser.deliveryAddress,
        district: adminUser.district,
        role: 'super_admin',
        isActive: true,
      },
      action: 'bootstrap_super_admin',
      entityType: 'user',
      entityId: adminUser.id,
    });

    const token = signSessionToken({
      uid: adminUser.uid,
      userId: adminUser.id,
      email: adminUser.email,
    });

    res.status(201).json({
      token,
      user: {
        id: adminUser.id,
        uid: adminUser.uid,
        email: adminUser.email,
        fullName: adminUser.fullName,
        phone: adminUser.phone,
        businessName: adminUser.businessName,
        deliveryAddress: adminUser.deliveryAddress,
        district: adminUser.district,
        role: adminUser.role,
        isActive: adminUser.isActive,
      },
    });
  } catch (err) {
    console.error('Bootstrap super admin failed:', err);
    res.status(500).json({ error: 'Failed to create Super Admin' });
  }
});

authRouter.post('/claim-initial-admin', requireAuth, async (req: AuthRequest, res) => {
  try {
    const existingAdmins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'super_admin'))
      .limit(1);

    if (existingAdmins.length > 0) {
      return res.status(403).json({
        error: 'A Super Admin account already exists.',
      });
    }

    const [updated] = await db
      .update(users)
      .set({ role: 'super_admin', updatedAt: new Date() })
      .where(eq(users.id, req.appUser!.id))
      .returning();

    await recordAuditLog({
      actor: { ...req.appUser!, role: 'super_admin' },
      action: 'claim_initial_super_admin',
      entityType: 'user',
      entityId: updated.id,
    });

    res.json({
      user: {
        ...req.appUser,
        role: updated.role,
      },
    });
  } catch (err) {
    console.error('Claim initial admin failed:', err);
    res.status(500).json({ error: 'Unable to claim Super Admin role' });
  }
});

// Customer account endpoints
authRouter.put('/account/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { fullName, phone, businessName, deliveryAddress, district } =
      req.body || {};
    const [updated] = await db
      .update(users)
      .set({
        fullName: String(fullName ?? req.appUser!.fullName).trim(),
        phone: String(phone ?? req.appUser!.phone).trim(),
        businessName: String(businessName ?? req.appUser!.businessName).trim(),
        deliveryAddress: String(
          deliveryAddress ?? req.appUser!.deliveryAddress
        ).trim(),
        district: String(district ?? req.appUser!.district).trim(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.appUser!.id))
      .returning();

    res.json({
      user: {
        id: updated.id,
        uid: updated.uid,
        email: updated.email,
        fullName: updated.fullName,
        phone: updated.phone,
        businessName: updated.businessName,
        deliveryAddress: updated.deliveryAddress,
        district: updated.district,
        role: updated.role,
        isActive: updated.isActive,
      },
    });
  } catch (err) {
    console.error('Update profile failed:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

authRouter.get('/account/orders', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, req.appUser!.id))
      .orderBy(desc(orders.createdAt));

    const orderIds = userOrders.map((o) => o.id);
    const items = orderIds.length
      ? await db
          .select()
          .from(orderItems)
          .where(inArray(orderItems.orderId, orderIds))
      : [];

    const itemsByOrder = new Map<number, typeof items>();
    for (const it of items) {
      const list = itemsByOrder.get(it.orderId) ?? [];
      list.push(it);
      itemsByOrder.set(it.orderId, list);
    }

    res.json(
      userOrders.map((o) => ({
        ...o,
        items: itemsByOrder.get(o.id) ?? [],
      }))
    );
  } catch (err) {
    console.error('Customer orders fetch failed:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

authRouter.get(
  '/account/quotations',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const rows = await db
        .select()
        .from(quotations)
        .where(eq(quotations.userId, req.appUser!.id))
        .orderBy(desc(quotations.createdAt));
      res.json(rows);
    } catch (err) {
      console.error('Customer quotations fetch failed:', err);
      res.status(500).json({ error: 'Failed to load quotations' });
    }
  }
);
