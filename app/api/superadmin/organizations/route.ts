import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSuperAdminSession } from '@/lib/superadmin';

export async function POST(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
    }

    const result = await query(
      'INSERT INTO organizations (name) VALUES (?)',
      [name.trim()]
    ) as { insertId: number };

    return NextResponse.json({ success: true, organizationId: result.insertId });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Organization already exists' }, { status: 400 });
    }
    console.error('Superadmin create organization error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create organization' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId, name } = await request.json();
    if (!organizationId || !name?.trim()) {
      return NextResponse.json({ error: 'Organization ID and name are required' }, { status: 400 });
    }

    await query('UPDATE organizations SET name = ? WHERE id = ?', [
      name.trim(),
      organizationId,
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Organization name already exists' }, { status: 400 });
    }
    console.error('Superadmin update organization error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update organization' },
      { status: 500 }
    );
  }
}
