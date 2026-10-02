import { query, queryOne } from './db';

const MFA_KEY = 'mfa_email_otp';

export async function ensureAppSettingsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key VARCHAR(64) PRIMARY KEY,
      setting_value VARCHAR(255) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await query(
    `INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES (?, ?)`,
    [MFA_KEY, '0']
  );
}

export async function isMfaEnabled(): Promise<boolean> {
  try {
    await ensureAppSettingsTable();
    const row = await queryOne<{ setting_value: string }>(
      'SELECT setting_value FROM app_settings WHERE setting_key = ?',
      [MFA_KEY]
    );
    return row?.setting_value === '1';
  } catch (error) {
    console.error('Failed to read MFA setting:', error);
    return false;
  }
}

export async function setMfaEnabled(enabled: boolean): Promise<void> {
  await ensureAppSettingsTable();
  await query(
    `INSERT INTO app_settings (setting_key, setting_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [MFA_KEY, enabled ? '1' : '0']
  );
}
