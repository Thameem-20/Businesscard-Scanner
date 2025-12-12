import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get all organizations
    const organizations = await query(
      'SELECT id, name, created_at FROM organizations ORDER BY name'
    );
    
    return NextResponse.json({ organizations });
    
  } catch (error: any) {
    console.error('List organizations error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

