import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSuperAdminSession } from '@/lib/superadmin';

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
