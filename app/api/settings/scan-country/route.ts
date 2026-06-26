import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { COUNTRIES } from '@/lib/countries';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt((session.user as any).id);
    const users = await query(
      'SELECT scan_country FROM users WHERE id = ?',
      [userId]
    ) as { scan_country: string | null }[];

    return NextResponse.json({
      scanCountry: users[0]?.scan_country || '',
      countries: COUNTRIES,
    });
  } catch (error: any) {
    console.error('Get scan country error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch scan country' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const scanCountry = typeof body.scanCountry === 'string' ? body.scanCountry.trim() : '';

    if (scanCountry && !COUNTRIES.includes(scanCountry as any)) {
      return NextResponse.json({ error: 'Invalid country selected' }, { status: 400 });
    }

    const userId = parseInt((session.user as any).id);

    await query('UPDATE users SET scan_country = ? WHERE id = ?', [
      scanCountry || null,
      userId,
    ]);

    return NextResponse.json({ success: true, scanCountry });
  } catch (error: any) {
    console.error('Save scan country error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save scan country' },
      { status: 500 }
    );
  }
}
