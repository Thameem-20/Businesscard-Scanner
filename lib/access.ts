import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { query, queryOne } from './db';

export const ORG_ROLES = ['admin', 'manager', 'user'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];
export type AppRole = OrgRole | 'superadmin';

export interface AccessContext {
  id: number;
  role: AppRole;
  organizationId: number | null;
  departmentIds: number[];
}

export function parseId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return parseInt(value, 10);
  return null;
}

export function isOrgRole(role: unknown): role is OrgRole {
  return typeof role === 'string' && (ORG_ROLES as readonly string[]).includes(role);
}

export async function getAccessContext(
  session?: { user?: unknown } | null
): Promise<AccessContext | null> {
  const sess = session ?? (await getServerSession(authOptions));
  if (!sess?.user) return null;

  const user = sess.user as {
    id?: unknown;
    role?: unknown;
    organizationId?: unknown;
  };

  const id = parseId(user.id);
  if (!id) return null;

  const rows = (await query(
    'SELECT department_id FROM user_departments WHERE user_id = ?',
    [id]
  )) as { department_id: number }[];

  return {
    id,
    role: (user.role as AppRole) || 'user',
    organizationId: parseId(user.organizationId),
    departmentIds: rows.map((row) => row.department_id),
  };
}

export function cardVisibilityClause(
  access: AccessContext,
  alias = 'bc'
): { sql: string; params: unknown[] } {
  if (access.role === 'superadmin') {
    return { sql: '1 = 1', params: [] };
  }

  if (!access.organizationId) {
    return { sql: '1 = 0', params: [] };
  }

  if (access.role === 'admin') {
    return { sql: `${alias}.organization_id = ?`, params: [access.organizationId] };
  }

  if (access.role === 'manager') {
    if (access.departmentIds.length === 0) {
      return {
        sql: `${alias}.organization_id = ? AND ${alias}.user_id = ?`,
        params: [access.organizationId, access.id],
      };
    }

    const placeholders = access.departmentIds.map(() => '?').join(', ');
    return {
      sql: `${alias}.organization_id = ? AND (${alias}.department_id IN (${placeholders}) OR ${alias}.user_id = ?)`,
      params: [access.organizationId, ...access.departmentIds, access.id],
    };
  }

  return {
    sql: `${alias}.organization_id = ? AND ${alias}.user_id = ?`,
    params: [access.organizationId, access.id],
  };
}

export async function canAccessCard(
  access: AccessContext,
  cardId: number
): Promise<boolean> {
  const visibility = cardVisibilityClause(access);
  const card = (await queryOne(
    `SELECT bc.id FROM business_cards bc WHERE bc.id = ? AND ${visibility.sql} LIMIT 1`,
    [cardId, ...visibility.params]
  )) as { id: number } | null;
  return Boolean(card);
}

export function isOrgAdmin(access: AccessContext): boolean {
  return access.role === 'admin' && access.organizationId != null;
}
