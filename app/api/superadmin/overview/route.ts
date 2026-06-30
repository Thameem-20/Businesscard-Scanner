import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSuperAdminSession } from '@/lib/superadmin';

function getDateFilter(dateParam: string | null): string {
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return dateParam;
  }
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filterDate = getDateFilter(request.nextUrl.searchParams.get('date'));

    const organizations = await query(
      `SELECT
         o.id,
         o.name,
         o.created_at,
         COUNT(DISTINCT u.id) AS total_users,
         COUNT(DISTINCT bc.id) AS total_cards,
         COUNT(DISTINCT CASE WHEN DATE(bc.created_at) = ? THEN bc.id END) AS cards_on_date
       FROM organizations o
       LEFT JOIN users u ON u.organization_id = o.id AND u.role != 'superadmin'
       LEFT JOIN business_cards bc ON bc.organization_id = o.id
       GROUP BY o.id, o.name, o.created_at
       ORDER BY o.name`,
      [filterDate]
    ) as any[];

    const [totals] = await query(
      `SELECT
         COUNT(DISTINCT o.id) AS total_organizations,
         COUNT(DISTINCT bc.id) AS total_cards,
         COUNT(DISTINCT CASE WHEN DATE(bc.created_at) = ? THEN bc.id END) AS cards_on_date,
         COUNT(DISTINCT CASE WHEN u.role != 'superadmin' THEN u.id END) AS total_users
       FROM organizations o
       LEFT JOIN business_cards bc ON bc.organization_id = o.id
       LEFT JOIN users u ON u.organization_id = o.id`,
      [filterDate]
    ) as any[];

    return NextResponse.json({
      filterDate,
      totals: totals || {
        total_organizations: 0,
        total_cards: 0,
        cards_on_date: 0,
        total_users: 0,
      },
      organizations,
    });
  } catch (error: any) {
    console.error('Superadmin overview error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch overview' },
      { status: 500 }
    );
  }
}
