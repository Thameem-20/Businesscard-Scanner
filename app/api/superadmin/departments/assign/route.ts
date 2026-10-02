import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getSuperAdminSession } from '@/lib/superadmin';
import { addUserToDepartment, removeUserFromDepartment } from '@/lib/departments';
import { isOrgRole } from '@/lib/access';

export async function POST(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId, departmentId, userId, role } = await request.json();
    if (!organizationId || !departmentId || !userId) {
      return NextResponse.json(
        { error: 'Organization ID, department ID, and user ID are required' },
        { status: 400 }
      );
    }

    if (role && !isOrgRole(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const user = await queryOne<{ id: number; role: string }>(
      'SELECT id, role FROM users WHERE id = ? AND organization_id = ?',
      [userId, organizationId]
    );
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (user.role === 'superadmin') {
      return NextResponse.json({ error: 'Cannot assign superadmin accounts' }, { status: 400 });
    }

    await addUserToDepartment(userId, departmentId, organizationId);

    if (role && user.role !== 'admin') {
      await query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Assign department member error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign user' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const departmentId = parseInt(request.nextUrl.searchParams.get('departmentId') || '', 10);
    const userId = parseInt(request.nextUrl.searchParams.get('userId') || '', 10);
    if (!departmentId || !userId) {
      return NextResponse.json(
        { error: 'Department ID and user ID are required' },
        { status: 400 }
      );
    }

    await removeUserFromDepartment(userId, departmentId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Remove department member error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove user' },
      { status: 400 }
    );
  }
}
