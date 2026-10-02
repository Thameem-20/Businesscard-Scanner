import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminSession } from '@/lib/superadmin';
import { isMfaEnabled, setMfaEnabled } from '@/lib/settings';

export async function GET() {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      mfaEmailOtp: await isMfaEnabled(),
      mailConfigured: Boolean(
        process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
      ),
    });
  } catch (error: any) {
    console.error('Superadmin settings error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mfaEmailOtp } = await request.json();
    if (typeof mfaEmailOtp !== 'boolean') {
      return NextResponse.json({ error: 'mfaEmailOtp must be true or false' }, { status: 400 });
    }

    if (mfaEmailOtp) {
      const mailReady = Boolean(
        process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
      );
      if (!mailReady) {
        return NextResponse.json(
          { error: 'Add SMTP settings to the server environment before enabling email OTP.' },
          { status: 400 }
        );
      }
    }

    await setMfaEnabled(mfaEmailOtp);
    return NextResponse.json({ success: true, mfaEmailOtp });
  } catch (error: any) {
    console.error('Superadmin update settings error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
