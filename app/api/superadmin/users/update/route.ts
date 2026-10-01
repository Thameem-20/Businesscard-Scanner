import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '@/lib/db';
import { getSuperAdminSession } from '@/lib/superadmin';
import { isOrgRole } from '@/lib/access';
import { setUserDepartments } from '@/lib/departments';

export async function PUT(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      userId,
      name,
      email,
      role,
      organizationId,
      isActive,
      password,
      departmentIds,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const targetUser = await queryOne(
      'SELECT id, role, email FROM users WHERE id = ?',
      [userId]
    ) as { id: number; role: string; email: string } | null;

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.role === 'superadmin') {
      return NextResponse.json({ error: 'Cannot edit superadmin accounts' }, { status: 400 });
    }

    if (role && !isOrgRole(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    if (email && email !== targetUser.email) {
      const existing = await queryOne(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );
      if (existing) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      values.push(role);
    }
    if (organizationId !== undefined) {
      updates.push('organization_id = ?');
      values.push(organizationId || null);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(isActive ? 1 : 0);
    }
    if (password && password.length >= 6) {
      updates.push('password = ?');
      values.push(await bcrypt.hash(password, 10));
    }

    if (updates.length > 0) {
      values.push(userId);
      await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    if (Array.isArray(departmentIds)) {
      const orgId =
        organizationId ??
        (
          (await queryOne(
            'SELECT organization_id FROM users WHERE id = ?',
            [userId]
          )) as { organization_id: number | null } | null
        )?.organization_id;

      if (!orgId) {
        return NextResponse.json(
          { error: 'User must belong to an organization to assign departments' },
          { status: 400 }
        );
      }

      await setUserDepartments(userId, departmentIds, orgId);
    }

    if (updates.length === 0 && !Array.isArray(departmentIds)) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Superadmin update user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}
