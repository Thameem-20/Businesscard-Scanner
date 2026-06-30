const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const { loadEnv } = require('./load-env');

loadEnv();

const SUPERADMIN_EMAIL = 'control@compasslog.com';
const SUPERADMIN_PASSWORD = 'Comp@ss2026';
const SUPERADMIN_NAME = 'Super Admin';

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

    const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);
    const [existing] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [SUPERADMIN_EMAIL]
    );

    if (existing.length > 0) {
      await connection.query(
        `UPDATE users SET password = ?, name = ?, role = 'superadmin', is_active = TRUE, organization_id = NULL
         WHERE email = ?`,
        [hashedPassword, SUPERADMIN_NAME, SUPERADMIN_EMAIL]
      );
      console.log('Updated existing superadmin user');
    } else {
      await connection.query(
        `INSERT INTO users (email, password, name, role, organization_id, is_active)
         VALUES (?, ?, ?, 'superadmin', NULL, TRUE)`,
        [SUPERADMIN_EMAIL, hashedPassword, SUPERADMIN_NAME]
      );
      console.log('Created superadmin user');
    }

    console.log('Superadmin migration completed successfully.');
    console.log(`Login: ${SUPERADMIN_EMAIL}`);
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
