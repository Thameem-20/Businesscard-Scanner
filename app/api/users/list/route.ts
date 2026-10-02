import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getAccessContext, userVisibilityClause } from '@/lib/access';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const access = await getAccessContext(session);

    if (!access || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const visibility = userVisibilityClause(access);
    const users = (await query(
      `SELECT
         u.id,
         u.email,
         u.name,
         u.role,
         u.is_active,
         u.created_at,
         GROUP_CONCAT(d.name ORDER BY d.name SEPARATOR ', ') AS departments,
         GROUP_CONCAT(d.id ORDER BY d.name) AS department_ids
       FROM users u
       LEFT JOIN user_departments ud ON ud.user_id = u.id
       LEFT JOIN departments d ON d.id = ud.department_id
       WHERE ${visibility.sql}
       GROUP BY u.id, u.email, u.name, u.role, u.is_active, u.created_at
       ORDER BY u.created_at DESC`,
      visibility.params
    )) as any[];

    return NextResponse.json({
      users: users.map((user) => ({
        ...user,
        department_ids: user.department_ids
          ? String(user.department_ids)
              .split(',')
              .map((id: string) => parseInt(id, 10))
              .filter((id: number) => Number.isFinite(id))
          : [],
        departments: user.departments || '',
      })),
    });
  } catch (error: any) {
    console.error('List users error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
