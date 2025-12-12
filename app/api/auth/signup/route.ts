import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, organizationName } = body;
    
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }
    
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
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
    
    // Create or get organization
    let organizationId = 1; // Default organization
    
    if (organizationName) {
      // Check if organization exists
      const existingOrg = await queryOne(
        'SELECT id FROM organizations WHERE name = ?',
        [organizationName]
      );
      
      if (existingOrg) {
        organizationId = existingOrg.id;
      } else {
        // Create new organization
        const orgResult = await query(
          'INSERT INTO organizations (name) VALUES (?)',
          [organizationName]
        ) as any;
        organizationId = orgResult.insertId;
      }
    }
    
    // Create user as admin
    const result = await query(
      `INSERT INTO users (email, password, name, role, organization_id)
       VALUES (?, ?, ?, 'admin', ?)`,
      [email, hashedPassword, name, organizationId]
    ) as any;
    
    return NextResponse.json({
      success: true,
      userId: result.insertId,
      message: 'Admin account created successfully! You can now login.',
    });
    
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: 500 }
    );
  }
}
