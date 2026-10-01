import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAccessContext, isOrgAdmin } from '@/lib/access';
import { createDepartment } from '@/lib/departments';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getAccessContext(session);

    if (!access || !isOrgAdmin(access) || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();
    const departmentId = await createDepartment(access.organizationId, name);

    return NextResponse.json({ success: true, departmentId });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Department already exists' }, { status: 400 });
    }
    console.error('Create department error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create department' },
      { status: 500 }
    );
  }
}
