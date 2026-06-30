import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getSuperAdminSession } from '@/lib/superadmin';

function getDateFilter(dateParam: string | null): string {
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return dateParam;
  }
  return new Date().toISOString().slice(0, 10);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = parseInt(params.id);
    if (isNaN(organizationId)) {
      return NextResponse.json({ error: 'Invalid organization ID' }, { status: 400 });
    }

    const filterDate = getDateFilter(request.nextUrl.searchParams.get('date'));
    const countryFilter = request.nextUrl.searchParams.get('country') || '';

    const organization = await queryOne(
      'SELECT id, name, created_at FROM organizations WHERE id = ?',
      [organizationId]
    );

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const [stats] = await query(
      `SELECT
         COUNT(DISTINCT bc.id) AS total_cards,
         COUNT(DISTINCT CASE WHEN DATE(bc.created_at) = ? THEN bc.id END) AS cards_on_date,
         COUNT(DISTINCT u.id) AS total_users,
         COUNT(DISTINCT CASE WHEN u.is_active = 1 OR u.is_active IS NULL THEN u.id END) AS active_users
       FROM organizations o
       LEFT JOIN business_cards bc ON bc.organization_id = o.id
       LEFT JOIN users u ON u.organization_id = o.id AND u.role != 'superadmin'
       WHERE o.id = ?
       GROUP BY o.id`,
      [filterDate, organizationId]
    ) as any[];

    const cardsByCountry = await query(
      `SELECT
         COALESCE(NULLIF(country, ''), 'Uncategorized') AS country,
         COUNT(*) AS count
       FROM business_cards
       WHERE organization_id = ?
       GROUP BY COALESCE(NULLIF(country, ''), 'Uncategorized')
       ORDER BY count DESC`,
      [organizationId]
    );

    const dailyReport = await query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM business_cards
       WHERE organization_id = ?
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [organizationId]
    );

    let recentCardsQuery = `
      SELECT bc.id, bc.name, bc.company, bc.country, bc.email, bc.created_at, u.name AS uploaded_by
      FROM business_cards bc
      JOIN users u ON bc.user_id = u.id
      WHERE bc.organization_id = ?
    `;
    const recentCardsParams: unknown[] = [organizationId];

    if (filterDate) {
      recentCardsQuery += ' AND DATE(bc.created_at) = ?';
      recentCardsParams.push(filterDate);
    }
    if (countryFilter) {
      if (countryFilter === '__uncategorized__') {
        recentCardsQuery += " AND (bc.country IS NULL OR bc.country = '')";
      } else {
        recentCardsQuery += ' AND bc.country = ?';
        recentCardsParams.push(countryFilter);
      }
    }

    recentCardsQuery += ' ORDER BY bc.created_at DESC LIMIT 100';

    const recentCards = await query(recentCardsQuery, recentCardsParams);

    const users = await query(
      `SELECT u.id, u.email, u.name, u.role, u.is_active, u.created_at
       FROM users u
       WHERE u.organization_id = ? AND u.role != 'superadmin'
       ORDER BY u.name`,
      [organizationId]
    );

    return NextResponse.json({
      organization,
      filterDate,
      stats: stats || {
        total_cards: 0,
        cards_on_date: 0,
        total_users: 0,
        active_users: 0,
      },
      cardsByCountry,
      dailyReport,
      recentCards,
      users,
    });
  } catch (error: any) {
    console.error('Superadmin organization detail error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}
