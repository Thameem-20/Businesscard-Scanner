const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const { loadEnv } = require('./load-env');

loadEnv();

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Add it to your .env file.');
  }
  return connectionString;
}

// Parse connection string
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

async function initDatabase() {
  const config = parseConnectionString(getConnectionString());
  const baseConfig = { ...config };
  delete baseConfig.database;

  // Connect without database first
  const connection = await mysql.createConnection(baseConfig);

  try {
    // Create database
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${config.database}`);
    await connection.query(`USE ${config.database}`);

    // Create tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user',
        organization_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
        INDEX idx_org_id (organization_id),
        INDEX idx_email (email)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS business_cards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        organization_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        job_title VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        website VARCHAR(255),
        image_url VARCHAR(500),
        cloud_storage_url VARCHAR(500),
        raw_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_org_id (organization_id),
        INDEX idx_name (name),
        INDEX idx_email (email),
        INDEX idx_phone (phone)
      )
    `);

    // Create default organization
    await connection.query(`
      INSERT IGNORE INTO organizations (id, name) 
      VALUES (1, 'Default Organization')
    `);

    // Create default admin user with hashed password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await connection.query(`
      INSERT IGNORE INTO users (id, email, password, name, role, organization_id) 
      VALUES (1, 'admin@example.com', ?, 'Admin User', 'admin', 1)
    `, [hashedPassword]);

    console.log('✅ Database initialized successfully!');
    console.log('📧 Default admin credentials:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');
    console.log('⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

initDatabase();

