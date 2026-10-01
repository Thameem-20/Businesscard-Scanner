import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminSession } from '@/lib/superadmin';
import { createDepartment, listDepartments } from '@/lib/departments';

export async function GET(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = parseInt(request.nextUrl.searchParams.get('organizationId') || '', 10);
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const departments = await listDepartments(organizationId);
    return NextResponse.json({ departments });
  } catch (error: any) {
    console.error('Superadmin list departments error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch departments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId, name } = await request.json();
    if (!organizationId || !name?.trim()) {
      return NextResponse.json(
        { error: 'Organization ID and department name are required' },
        { status: 400 }
      );
    }

    const departmentId = await createDepartment(organizationId, name);
    return NextResponse.json({ success: true, departmentId });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Department already exists' }, { status: 400 });
    }
    console.error('Superadmin create department error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create department' },
      { status: 400 }
    );
  }
}
