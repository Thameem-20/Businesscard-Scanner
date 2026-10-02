import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '@/lib/db';
import { getSuperAdminSession } from '@/lib/superadmin';
import { isOrgRole } from '@/lib/access';
import { setUserDepartments } from '@/lib/departments';

export async function GET(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = request.nextUrl.searchParams.get('organizationId');

    let users;
    if (organizationId) {
      users = await query(
        `SELECT u.id, u.email, u.name, u.role, u.is_active, u.organization_id,
                o.name AS organization_name, u.created_at
         FROM users u
         LEFT JOIN organizations o ON u.organization_id = o.id
         WHERE u.role != 'superadmin' AND u.organization_id = ?
         ORDER BY u.name`,
        [organizationId]
      );
    } else {
      users = await query(
        `SELECT u.id, u.email, u.name, u.role, u.is_active, u.organization_id,
                o.name AS organization_name, u.created_at
         FROM users u
         LEFT JOIN organizations o ON u.organization_id = o.id
         WHERE u.role != 'superadmin'
         ORDER BY o.name, u.name`
      );
    }

    const organizations = await query(
      'SELECT id, name FROM organizations ORDER BY name'
    );

    return NextResponse.json({ users, organizations });
  } catch (error: any) {
    console.error('Superadmin users list error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId, name, email, password, role = 'user', departmentIds = [] } = await request.json();
    if (!organizationId || !name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: 'Organization, name, email, and password are required' },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    if (!isOrgRole(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email.trim()]);
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = (await query(
      `INSERT INTO users (email, password, name, role, organization_id, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [email.trim(), hashedPassword, name.trim(), role, organizationId]
    )) as { insertId: number };

    if (Array.isArray(departmentIds) && departmentIds.length > 0) {
      await setUserDepartments(result.insertId, departmentIds, organizationId);
    }

    return NextResponse.json({ success: true, userId: result.insertId });
  } catch (error: any) {
    console.error('Superadmin create user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 400 }
    );
  }
}
