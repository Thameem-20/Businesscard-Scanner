import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { getAccessContext, isOrgAdmin, isOrgRole } from '@/lib/access';
import { setUserDepartments } from '@/lib/departments';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getAccessContext(session);

    if (!access || !isOrgAdmin(access) || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, role, departmentIds } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (role !== undefined && !isOrgRole(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const targetUser = (await queryOne(
      'SELECT id, role, organization_id FROM users WHERE id = ? AND organization_id = ?',
      [userId, access.organizationId]
    )) as { id: number; role: string; organization_id: number } | null;

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.id === access.id && role && role !== access.role) {
      return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });
    }

    if (role !== undefined) {
      await query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    }

    if (Array.isArray(departmentIds)) {
      await setUserDepartments(userId, departmentIds, access.organizationId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 400 }
    );
  }
}
