import mysql from 'mysql2/promise';

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Add it to your .env file.');
  }
  return connectionString;
}

// Parse connection string
function parseConnectionString(connectionString: string) {
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username || 'root',
    password: url.password || '',
    database: url.pathname.slice(1), // Remove leading '/'
  };
}

const config = parseConnectionString(getConnectionString());

// Create connection pool
const pool = mysql.createPool({
  ...config,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function query(sql: string, params?: any[]) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function queryOne(sql: string, params?: any[]) {
  const results = await query(sql, params) as any[];
  return results[0] || null;
}

export { pool };

