import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { COUNTRIES } from '@/lib/countries';
import { getEffectiveScanCountry } from '@/lib/departments';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt((session.user as any).id);
    const country = await getEffectiveScanCountry(userId);

    return NextResponse.json({
      scanCountry: country.scanCountry || '',
      departmentCountry: country.departmentCountry || '',
      departmentName: country.departmentName || '',
      effectiveCountry: country.effectiveCountry || '',
      source: country.source,
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

    if (scanCountry.length > 100) {
      return NextResponse.json(
        { error: 'Country or network name must be 100 characters or less' },
        { status: 400 }
      );
    }

    const userId = parseInt((session.user as any).id);

    await query('UPDATE users SET scan_country = ? WHERE id = ?', [
      scanCountry || null,
      userId,
    ]);

    const country = await getEffectiveScanCountry(userId);

    return NextResponse.json({
      success: true,
      scanCountry: country.scanCountry || '',
      departmentCountry: country.departmentCountry || '',
      departmentName: country.departmentName || '',
      effectiveCountry: country.effectiveCountry || '',
      source: country.source,
    });
  } catch (error: any) {
    console.error('Save scan country error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save scan country' },
      { status: 500 }
    );
  }
}
