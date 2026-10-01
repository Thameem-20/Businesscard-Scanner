import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getAccessContext, isOrgAdmin, isOrgRole } from '@/lib/access';
import { setUserDepartments } from '@/lib/departments';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getAccessContext(session);

    if (!access || !isOrgAdmin(access)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      email,
      password,
      name,
      role = 'user',
      organizationId,
      departmentIds = [],
    } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    if (!isOrgRole(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const existingUser = await queryOne(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userOrgId = organizationId || access.organizationId;

    const result = (await query(
      `INSERT INTO users (email, password, name, role, organization_id)
       VALUES (?, ?, ?, ?, ?)`,
      [email, hashedPassword, name, role, userOrgId]
    )) as { insertId: number };

    if (Array.isArray(departmentIds) && departmentIds.length > 0) {
      await setUserDepartments(result.insertId, departmentIds, userOrgId);
    }

    return NextResponse.json({
      success: true,
      userId: result.insertId,
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 400 }
    );
  }
}
