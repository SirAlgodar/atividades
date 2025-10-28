require('dotenv').config();
const mariadb = require('mariadb');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
  let conn;
  try {
    conn = await mariadb.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    // Create database if it doesn't exist
    await conn.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    await conn.query(`USE ${process.env.DB_NAME}`);

    // Create users table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user',
        active BOOLEAN DEFAULT true,
        password_changed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create activities table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id INT PRIMARY KEY AUTO_INCREMENT,
        origin VARCHAR(100) NOT NULL,
        activity VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        duration VARCHAR(10) NOT NULL,
        status ENUM('pendente', 'concluida') DEFAULT 'pendente',
        priority ENUM('baixa', 'media', 'alta') DEFAULT 'media',
        responsible_id INT,
        observation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (responsible_id) REFERENCES users(id)
      )
    `);

    // Create webhook_config table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS webhook_config (
        id INT PRIMARY KEY AUTO_INCREMENT,
        url VARCHAR(255) NOT NULL,
        active BOOLEAN DEFAULT false,
        auto_send BOOLEAN DEFAULT false,
        fields JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Check if admin user exists
    const [adminExists] = await conn.query("SELECT * FROM users WHERE email = 'admin'");
    
    // Create default admin user if not exists
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin', 10);
      await conn.query(`
        INSERT INTO users (name, email, password, role, password_changed) 
        VALUES ('Administrator', 'admin', ?, 'admin', false)
      `, [hashedPassword]);
      console.log('Default admin user created');
    }

    console.log('Database setup completed successfully');
  } catch (err) {
    console.error('Error setting up database:', err);
  } finally {
    if (conn) conn.end();
  }
}

setupDatabase();