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

async function tableExists(connection, database, table) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) as count FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [database, table]
  );
  return rows[0].count > 0;
}

async function columnExists(connection, database, table, column) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) as count FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [database, table, column]
  );
  return rows[0].count > 0;
}

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set.');
  }

  const config = parseConnectionString(connectionString);
  const connection = await mysql.createConnection(config);

  try {
    await connection.query(`
      ALTER TABLE users
      MODIFY COLUMN role ENUM('admin', 'manager', 'user', 'superadmin') DEFAULT 'user'
    `);
    console.log('Updated users.role enum to include manager');

    if (!(await tableExists(connection, config.database, 'departments'))) {
      await connection.query(`
        CREATE TABLE departments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_org_dept (organization_id, name),
          INDEX idx_org_id (organization_id),
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
        )
      `);
      console.log('Created departments table');
    } else {
      console.log('departments table already exists');
    }

    if (!(await tableExists(connection, config.database, 'user_departments'))) {
      await connection.query(`
        CREATE TABLE user_departments (
          user_id INT NOT NULL,
          department_id INT NOT NULL,
          PRIMARY KEY (user_id, department_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
        )
      `);
      console.log('Created user_departments table');
    } else {
      console.log('user_departments table already exists');
    }

    if (!(await columnExists(connection, config.database, 'business_cards', 'department_id'))) {
      await connection.query(
        'ALTER TABLE business_cards ADD COLUMN department_id INT NULL'
      );
      await connection.query(
        'ALTER TABLE business_cards ADD INDEX idx_department_id (department_id)'
      );
      await connection.query(`
        ALTER TABLE business_cards
        ADD CONSTRAINT fk_cards_department
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
      `);
      console.log('Added business_cards.department_id');
    } else {
      console.log('business_cards.department_id already exists');
    }

    const [seedResult] = await connection.query(`
      INSERT IGNORE INTO departments (organization_id, name)
      SELECT id, 'Sales' FROM organizations
    `);
    console.log(`Seeded Sales department for existing organizations (${seedResult.affectedRows || 0} added)`);

    console.log('Department / manager role migration completed.');
    console.log('Next: assign users to departments in My Team so managers can see existing cards.');
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
