import nodemailer from 'nodemailer';

function isMailEnabled(): boolean {
  const flag = (process.env.MAIL_ENABLED || '').toLowerCase();
  return flag === 'true' || flag === '1';
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = (process.env.SMTP_SECURE || '').toLowerCase() === 'true';

  if (!host || !user || !pass) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    requireTLS: !secure && port === 587,
  });
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  if (!isMailEnabled()) {
    throw new Error('Email sending is disabled. Set MAIL_ENABLED=true.');
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  if (!from) {
    throw new Error('MAIL_FROM is not set.');
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from,
    to,
    subject: 'Your Card Scanner login code',
    text: `Your one-time login code is ${code}. It expires in 10 minutes. If you did not try to sign in, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111827;">
        <h2 style="margin-bottom: 12px;">Card Scanner login code</h2>
        <p>Use this code to finish signing in. It expires in 10 minutes.</p>
        <p style="font-size: 32px; letter-spacing: 8px; font-weight: bold; margin: 24px 0;">${code}</p>
        <p style="color: #6b7280; font-size: 13px;">If you did not try to sign in, you can ignore this email.</p>
      </div>
    `,
  });
}
