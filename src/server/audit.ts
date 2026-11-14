import { db } from '../db/index.ts';
import { auditLogs } from '../db/schema.ts';
import type { AppUserRecord } from '../middleware/auth.ts';

export async function recordAuditLog(params: {
  actor?: AppUserRecord;
  action: string;
  entityType: string;
  entityId?: string | number;
  details?: Record<string, unknown>;
}) {
  try {
    await db.insert(auditLogs).values({
      actorId: params.actor?.id ?? null,
      actorEmail: params.actor?.email ?? 'system',
      actorRole: params.actor?.role ?? 'system',
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId !== undefined ? String(params.entityId) : '',
      details: params.details ?? {},
    });
  } catch (err) {
    console.error('Audit log insert failed:', err);
  }
}
