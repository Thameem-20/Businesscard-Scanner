import { query, queryOne } from './db';

export interface Department {
  id: number;
  name: string;
  created_at?: string;
}

export async function listDepartments(organizationId: number): Promise<Department[]> {
  return (await query(
    'SELECT id, name, created_at FROM departments WHERE organization_id = ? ORDER BY name',
    [organizationId]
  )) as Department[];
}

export async function createDepartment(
  organizationId: number,
  name: string
): Promise<number> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Department name is required');
  }

  const result = (await query(
    'INSERT INTO departments (organization_id, name) VALUES (?, ?)',
    [organizationId, trimmed]
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
