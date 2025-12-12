import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const organizationId = (session.user as any).organizationId;
    
    // Get all users in the same organization
    // All users (admin and regular) can view their team members
    const users = await query(
      `SELECT id, email, name, role, is_active, created_at 
       FROM users 
       WHERE organization_id = ?
       ORDER BY created_at DESC`,
      [organizationId]
    );
    
    return NextResponse.json({ users });
    
  } catch (error: any) {
    console.error('List users error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

