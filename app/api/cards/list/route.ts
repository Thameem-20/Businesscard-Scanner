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
    
    // Get all cards from the same organization
    const cards = await query(
      `SELECT bc.*, u.name as uploaded_by 
       FROM business_cards bc
       JOIN users u ON bc.user_id = u.id
       WHERE bc.organization_id = ?
       ORDER BY bc.created_at DESC`,
      [organizationId]
    );
    
    return NextResponse.json({ cards });
    
  } catch (error: any) {
    console.error('List cards error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch business cards' },
      { status: 500 }
    );
  }
}

