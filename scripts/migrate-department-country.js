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

async function columnExists(connection, table, column) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) as count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [parseConnectionString(process.env.DATABASE_URL).database, table, column]
  );
  return rows[0].count > 0;
}

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set.');
  }

  const connection = await mysql.createConnection(parseConnectionString(connectionString));

  try {
    if (!(await columnExists(connection, 'departments', 'country'))) {
      await connection.query(
        'ALTER TABLE departments ADD COLUMN country VARCHAR(100) NULL'
      );
      console.log('Added departments.country');
    } else {
      console.log('departments.country already exists');
    }

    console.log('Department country migration completed successfully.');
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
