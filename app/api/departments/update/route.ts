import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAccessContext, isOrgAdmin } from '@/lib/access';
import { renameDepartment } from '@/lib/departments';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getAccessContext(session);

    if (!access || !isOrgAdmin(access) || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { departmentId, name, country } = await request.json();
    if (!departmentId || !name?.trim()) {
      return NextResponse.json(
        { error: 'Department ID and name are required' },
        { status: 400 }
      );
    }

    await renameDepartment(departmentId, access.organizationId, name, country);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Department already exists' }, { status: 400 });
    }
    console.error('Update department error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update department' },
      { status: 400 }
    );
  }
}
