const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const connectionString = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/compassbusinesscard';

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

async function resetAdminPassword() {
  const config = parseConnectionString(connectionString);
  const connection = await mysql.createConnection(config);

  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Update the admin user's password
    await connection.query(
      `UPDATE users SET password = ? WHERE email = 'admin@example.com'`,
      [hashedPassword]
    );

    console.log('✅ Admin password reset successfully!');
    console.log('📧 Login credentials:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');

  } catch (error) {
    console.error('❌ Error resetting password:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

resetAdminPassword();

