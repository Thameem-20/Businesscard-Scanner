const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const { loadEnv } = require('./load-env');

loadEnv();

function parseConnectionString(connectionString) {
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username || 'root',
    password: url.password || '',
    database: url.pathname.slice(1),
  };
}

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set.');
  }

  const superadminEmail = process.env.SUPERADMIN_EMAIL?.trim();
  const superadminPassword = process.env.SUPERADMIN_PASSWORD;
  const superadminName = process.env.SUPERADMIN_NAME?.trim() || 'Super Admin';

  const connection = await mysql.createConnection(parseConnectionString(connectionString));

  try {
    await connection.query(`
      ALTER TABLE users
      MODIFY COLUMN role ENUM('admin', 'user', 'superadmin') DEFAULT 'user'
    `);
    console.log('Updated users.role enum to include superadmin');

    const [columns] = await connection.query(
      `SELECT COUNT(*) as count FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_active'`,
      [parseConnectionString(connectionString).database]
    );
    if (columns[0].count === 0) {
      await connection.query(
        'ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE'
      );
      console.log('Added users.is_active');
    }

    if (!superadminEmail || !superadminPassword) {
      console.log('Schema migration completed.');
      console.log('Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in .env, then re-run to create the superadmin user.');
      return;
    }

    const hashedPassword = await bcrypt.hash(superadminPassword, 10);
    const [existing] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [superadminEmail]
    );

    if (existing.length > 0) {
      await connection.query(
        `UPDATE users SET password = ?, name = ?, role = 'superadmin', is_active = TRUE, organization_id = NULL
         WHERE email = ?`,
        [hashedPassword, superadminName, superadminEmail]
      );
      console.log('Updated existing superadmin user');
    } else {
      await connection.query(
        `INSERT INTO users (email, password, name, role, organization_id, is_active)
         VALUES (?, ?, ?, 'superadmin', NULL, TRUE)`,
        [superadminEmail, hashedPassword, superadminName]
      );
      console.log('Created superadmin user');
    }

    console.log('Superadmin migration completed successfully.');
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
