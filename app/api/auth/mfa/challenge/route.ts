import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, verifyUserPassword } from '@/lib/auth';
import { isMfaEnabled } from '@/lib/settings';
import { issueLoginOtp } from '@/lib/mfa';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user || !(await verifyUserPassword(user, password))) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (user.is_active === false || user.is_active === 0) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact an administrator.' },
        { status: 403 }
      );
    }

    if (user.role === 'superadmin' || !(await isMfaEnabled())) {
      return NextResponse.json({ mfaRequired: false });
    }

    await issueLoginOtp(user.email);
    return NextResponse.json({
      mfaRequired: true,
      message: 'We sent a 6-digit code to your email.',
    });
  } catch (error: any) {
    console.error('MFA challenge error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start sign in' },
      { status: 400 }
    );
  }
}
