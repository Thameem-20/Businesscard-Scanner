import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAccessContext } from '@/lib/access';
import { listDepartments } from '@/lib/departments';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const access = await getAccessContext(session);

    if (!access || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const departments = await listDepartments(access.organizationId);
    return NextResponse.json({ departments });
  } catch (error: any) {
    console.error('List departments error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch departments' },
      { status: 500 }
    );
  }
}
