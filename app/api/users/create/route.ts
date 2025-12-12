import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { email, password, name, role = 'user', organizationId } = body;
    
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUser = await queryOne(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Use admin's organization if not specified
    const userOrgId = organizationId || (session.user as any).organizationId;
    
    // Create user
    const result = await query(
      `INSERT INTO users (email, password, name, role, organization_id)
       VALUES (?, ?, ?, ?, ?)`,
      [email, hashedPassword, name, role, userOrgId]
    ) as any;
    
    return NextResponse.json({
      success: true,
      userId: result.insertId,
    });
    
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}

