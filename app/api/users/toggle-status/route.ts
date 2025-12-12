import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can toggle user status
    const userRole = (session.user as any)?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userId, isActive } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prevent deactivating yourself
    const currentUserId = parseInt((session.user as any).id);
    if (parseInt(userId) === currentUserId) {
      return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 });
    }

    // Check if the user being toggled is an admin
    const targetUser = await queryOne(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    ) as any;

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.role === 'admin') {
      return NextResponse.json({ error: 'Cannot deactivate admin users' }, { status: 400 });
    }

    // Update user status
    await query(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [isActive ? 1 : 0, userId]
    );

    return NextResponse.json({ 
      success: true,
      message: `User has been ${isActive ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error: any) {
    console.error('Toggle user status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user status' },
      { status: 500 }
    );
  }
}

