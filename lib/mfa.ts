import bcrypt from 'bcryptjs';
import { query, queryOne } from './db';
import { sendOtpEmail } from './mailer';

const OTP_TTL_MINUTES = 10;
const RESEND_SECONDS = 45;

export async function ensureOtpTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS login_otps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      code_hash VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      consumed_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_expires (expires_at)
    )
  `);
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function issueLoginOtp(email: string): Promise<void> {
  await ensureOtpTable();
  const normalized = email.trim().toLowerCase();

  const latest = await queryOne<{ created_at: Date | string }>(
    `SELECT created_at FROM login_otps
     WHERE email = ? AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [normalized]
  );

  if (latest?.created_at) {
    const created = new Date(latest.created_at).getTime();
    if (Date.now() - created < RESEND_SECONDS * 1000) {
      throw new Error(`Please wait ${RESEND_SECONDS} seconds before requesting another code.`);
    }
  }

  await query(
    `UPDATE login_otps SET consumed_at = NOW()
     WHERE email = ? AND consumed_at IS NULL`,
    [normalized]
  );

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);

  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  await query(
    `INSERT INTO login_otps (email, code_hash, expires_at)
     VALUES (?, ?, ?)`,
    [normalized, codeHash, expiresAt]
  );

  await sendOtpEmail(normalized, code);
}

export async function verifyLoginOtp(email: string, code: string): Promise<boolean> {
  await ensureOtpTable();
  const normalized = email.trim().toLowerCase();
  const trimmedCode = (code || '').trim();
  if (!/^\d{6}$/.test(trimmedCode)) {
    return false;
  }

  const row = await queryOne<{ id: number; code_hash: string }>(
    `SELECT id, code_hash FROM login_otps
     WHERE email = ? AND consumed_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [normalized]
  );

  if (!row) {
    return false;
  }

  const matches = await bcrypt.compare(trimmedCode, row.code_hash);
  if (!matches) {
    return false;
  }

  await query('UPDATE login_otps SET consumed_at = NOW() WHERE id = ?', [row.id]);
  return true;
}
