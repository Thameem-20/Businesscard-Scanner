import { query, queryOne } from './db';
import { normalizeCountry } from './countries';

export interface Department {
  id: number;
  name: string;
  country?: string | null;
  created_at?: string;
}

export async function listDepartments(organizationId: number): Promise<Department[]> {
  return (await query(
    'SELECT id, name, country, created_at FROM departments WHERE organization_id = ? ORDER BY name',
    [organizationId]
  )) as Department[];
}

export async function createDepartment(
  organizationId: number,
  name: string,
  country?: string | null
): Promise<number> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Department name is required');
  }

  const result = (await query(
    'INSERT INTO departments (organization_id, name, country) VALUES (?, ?, ?)',
    [organizationId, trimmed, normalizeCountry(country)]
  )) as { insertId: number };

  return result.insertId;
}

export async function seedDefaultDepartments(organizationId: number): Promise<void> {
  await query(
    'INSERT IGNORE INTO departments (organization_id, name) VALUES (?, ?)',
    [organizationId, 'Sales']
  );
}

export async function getPrimaryDepartmentId(userId: number): Promise<number | null> {
  const row = (await queryOne(
    'SELECT department_id FROM user_departments WHERE user_id = ? ORDER BY department_id ASC LIMIT 1',
    [userId]
  )) as { department_id: number } | null;
  return row?.department_id ?? null;
}

export async function getEffectiveScanCountry(userId: number): Promise<{
  scanCountry: string | null;
  departmentCountry: string | null;
  departmentName: string | null;
  effectiveCountry: string | null;
  source: 'user' | 'department' | null;
}> {
  const user = (await queryOne(
    'SELECT scan_country FROM users WHERE id = ?',
    [userId]
  )) as { scan_country: string | null } | null;

  const department = (await queryOne(
    `SELECT d.name, d.country
     FROM user_departments ud
     JOIN departments d ON d.id = ud.department_id
     WHERE ud.user_id = ?
     ORDER BY ud.department_id ASC
     LIMIT 1`,
    [userId]
  )) as { name: string; country: string | null } | null;

  const scanCountry = user?.scan_country?.trim() || null;
  const departmentCountry = department?.country?.trim() || null;
  const effectiveCountry = scanCountry || departmentCountry;

  return {
    scanCountry,
    departmentCountry,
    departmentName: department?.name || null,
    effectiveCountry,
    source: scanCountry ? 'user' : departmentCountry ? 'department' : null,
  };
}

export async function setUserDepartments(
  userId: number,
  departmentIds: number[],
  organizationId: number
): Promise<void> {
  const uniqueIds = Array.from(
    new Set(
      departmentIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
    )
  );

  if (uniqueIds.length > 0) {
    const placeholders = uniqueIds.map(() => '?').join(', ');
    const valid = (await query(
      `SELECT id FROM departments WHERE organization_id = ? AND id IN (${placeholders})`,
      [organizationId, ...uniqueIds]
    )) as { id: number }[];

    if (valid.length !== uniqueIds.length) {
      throw new Error('One or more departments are invalid for this organization');
    }
  }

  await query('DELETE FROM user_departments WHERE user_id = ?', [userId]);

  for (const departmentId of uniqueIds) {
    await query(
      'INSERT INTO user_departments (user_id, department_id) VALUES (?, ?)',
      [userId, departmentId]
    );
  }

  if (uniqueIds.length > 0) {
    await query(
      `UPDATE business_cards
       SET department_id = ?
       WHERE user_id = ? AND organization_id = ? AND department_id IS NULL`,
      [uniqueIds[0], userId, organizationId]
    );
  }
}

export async function renameDepartment(
  departmentId: number,
  organizationId: number,
  name: string,
  country?: string | null
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Department name is required');
  }

  const result = (await query(
    'UPDATE departments SET name = ?, country = ? WHERE id = ? AND organization_id = ?',
    [trimmed, normalizeCountry(country), departmentId, organizationId]
  )) as { affectedRows?: number };

  if (!result.affectedRows) {
    throw new Error('Department not found');
  }
}

export async function deleteDepartment(
  departmentId: number,
  organizationId: number
): Promise<void> {
  const cards = await queryOne<{ count: number }>(
    'SELECT COUNT(*) AS count FROM business_cards WHERE department_id = ?',
    [departmentId]
  );
  if ((cards?.count || 0) > 0) {
    throw new Error('Cannot delete a department that still has cards. Move the cards first.');
  }

  const result = (await query(
    'DELETE FROM departments WHERE id = ? AND organization_id = ?',
    [departmentId, organizationId]
  )) as { affectedRows?: number };

  if (!result.affectedRows) {
    throw new Error('Department not found');
  }
}

export async function addUserToDepartment(
  userId: number,
  departmentId: number,
  organizationId: number
): Promise<void> {
  const department = await queryOne<{ id: number }>(
    'SELECT id FROM departments WHERE id = ? AND organization_id = ?',
    [departmentId, organizationId]
  );
  if (!department) {
    throw new Error('Department not found');
  }

  const user = await queryOne<{ id: number }>(
    'SELECT id FROM users WHERE id = ? AND organization_id = ?',
    [userId, organizationId]
  );
  if (!user) {
    throw new Error('User not found in this organization');
  }

  await query(
    'INSERT IGNORE INTO user_departments (user_id, department_id) VALUES (?, ?)',
    [userId, departmentId]
  );
}

export async function removeUserFromDepartment(
  userId: number,
  departmentId: number
): Promise<void> {
  await query(
    'DELETE FROM user_departments WHERE user_id = ? AND department_id = ?',
    [userId, departmentId]
  );
}
