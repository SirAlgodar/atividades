import 'dotenv/config';
import mariadb from 'mariadb';
import bcrypt from 'bcryptjs';

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

    // Create users table (roles: view/editor/admin) and can_login flag
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        role ENUM('view', 'editor', 'admin') DEFAULT 'view',
        active BOOLEAN DEFAULT true,
        can_login BOOLEAN DEFAULT false,
        password_changed BOOLEAN DEFAULT false,
        sector_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure sector_id column exists in users (for existing installations)
    const [sectorColRow] = await conn.query(`
      SELECT COUNT(*) AS cnt
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'sector_id'
    `, [process.env.DB_NAME]);
    if (!sectorColRow || Number(sectorColRow.cnt) === 0) {
      try {
        await conn.query('ALTER TABLE users ADD COLUMN sector_id INT NULL');
      } catch (e) {
        console.warn('Skipping users.sector_id add:', e.message);
      }
    }

    // Ensure can_login column exists in users
    const [canLoginColRow] = await conn.query(`
      SELECT COUNT(*) AS cnt
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'can_login'
    `, [process.env.DB_NAME]);
    if (!canLoginColRow || Number(canLoginColRow.cnt) === 0) {
      try {
        await conn.query('ALTER TABLE users ADD COLUMN can_login BOOLEAN DEFAULT false');
      } catch (e) {
        console.warn('Skipping users.can_login add:', e.message);
      }
    }

    // Migrate role enum to view/editor/admin and map legacy 'user' to 'editor'
    try {
      const [roleColInfo] = await conn.query(`
        SELECT COLUMN_TYPE FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
      `, [process.env.DB_NAME]);
      const columnType = roleColInfo ? String(roleColInfo.COLUMN_TYPE || '') : '';
      const hasUser = columnType.includes("'user'");
      const hasView = columnType.includes("'view'");
      const hasEditor = columnType.includes("'editor'");
      const hasAdmin = columnType.includes("'admin'");

      // If legacy enum missing new roles, transition via superset including 'user'
      if (!hasView || !hasEditor) {
        try {
          await conn.query("ALTER TABLE users MODIFY COLUMN role ENUM('user','view','editor','admin') DEFAULT 'view'");
        } catch (e) {
          console.warn('Skipping broad enum modification (user,view,editor,admin):', e.message);
        }
        try {
          await conn.query("UPDATE users SET role='editor' WHERE role='user'");
        } catch (e) {
          console.warn('Skipping role value migration from user->editor:', e.message);
        }
        try {
          await conn.query("ALTER TABLE users MODIFY COLUMN role ENUM('view','editor','admin') DEFAULT 'view'");
        } catch (e) {
          console.warn('Skipping final enum modification (view,editor,admin):', e.message);
        }
      } else {
        // Ensure final enum ordering and default even if already present
        try {
          await conn.query("ALTER TABLE users MODIFY COLUMN role ENUM('view','editor','admin') DEFAULT 'view'");
        } catch (e) {
          console.warn('Skipping enum normalization:', e.message);
        }
      }
    } catch (e) {
      console.warn('Role enum inspection/migration failed:', e.message);
    }

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
        created_by INT NULL,
        observation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (responsible_id) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Ensure created_by column exists in activities for legacy installs
    const [createdByColRow] = await conn.query(`
      SELECT COUNT(*) AS cnt
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'activities'
        AND COLUMN_NAME = 'created_by'
    `, [process.env.DB_NAME]);
    if (!createdByColRow || Number(createdByColRow.cnt) === 0) {
      try {
        await conn.query('ALTER TABLE activities ADD COLUMN created_by INT NULL');
        await conn.query('ALTER TABLE activities ADD CONSTRAINT fk_activities_created_by FOREIGN KEY (created_by) REFERENCES users(id)');
      } catch (e) {
        console.warn('Skipping activities.created_by add:', e.message);
      }
    }

    // Indexes for performance
    try {
      await conn.query('CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date)');
    } catch (e) {
      try { await conn.query('CREATE INDEX idx_activities_date ON activities(date)'); } catch (_) {}
    }
    try {
      await conn.query('CREATE INDEX IF NOT EXISTS idx_activities_responsible ON activities(responsible_id)');
    } catch (e) {
      try { await conn.query('CREATE INDEX idx_activities_responsible ON activities(responsible_id)'); } catch (_) {}
    }

    // Create sectors table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sectors (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default sector
    const [sectorCountRow] = await conn.query('SELECT COUNT(*) AS cnt FROM sectors');
    if (!sectorCountRow || Number(sectorCountRow.cnt) === 0) {
      await conn.query("INSERT INTO sectors (name, active) VALUES ('Geral', true)");
      console.log('Default sector "Geral" created');
    }

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

    // Seed default webhook configuration
    const [webhookExists] = await conn.query('SELECT COUNT(*) AS cnt FROM webhook_config');
    if (!webhookExists || Number(webhookExists.cnt) === 0) {
      const defaultFields = JSON.stringify({
        origin: true,
        activity: true,
        date: true,
        duration: true,
        status: true,
        priority: true,
        responsible: true,
        observation: false
      });
      await conn.query(
        'INSERT INTO webhook_config (url, active, auto_send, fields) VALUES (?, ?, ?, ?)',
        ['https://example.com/webhook', false, false, defaultFields]
      );
      console.log('Default webhook configuration created');
    }

    // Ensure foreign key from users(sector_id) to sectors(id)
    const [fkExistsRow] = await conn.query(`
      SELECT COUNT(*) AS cnt
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'sector_id'
        AND REFERENCED_TABLE_NAME = 'sectors'
    `, [process.env.DB_NAME]);

    if (!fkExistsRow || Number(fkExistsRow.cnt) === 0) {
      try {
        await conn.query(`
          ALTER TABLE users
          ADD CONSTRAINT fk_users_sector
          FOREIGN KEY (sector_id) REFERENCES sectors(id)
          ON DELETE SET NULL
        `);
      } catch (e) {
        console.warn('Skipping users->sectors FK creation:', e.message);
      }
    }

    // Ensure admin user exists and has access enabled
    try {
      const [adminExists] = await conn.query("SELECT * FROM users WHERE email = 'admin'");
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin', 10);
        const [defaultSector] = await conn.query("SELECT id FROM sectors WHERE name = 'Geral' LIMIT 1");
        const defaultSectorId = defaultSector ? defaultSector.id : null;
        await conn.query(`
          INSERT INTO users (name, email, password, role, active, can_login, password_changed, sector_id) 
          VALUES ('Administrator', 'admin', ?, 'admin', true, true, false, ?)
        `, [hashedPassword, defaultSectorId]);
        console.log('Default admin user created');
      } else {
        // Normalize existing admin to have access enabled
        await conn.query("UPDATE users SET active = true, can_login = true, role = 'admin' WHERE email = 'admin'");
      }
    } catch (e) {
      console.warn('Admin user ensure failed:', e.message);
    }

    console.log('Database setup completed successfully');
  } catch (err) {
    console.error('Error setting up database:', err);
  } finally {
    if (conn) conn.end();
  }
}

setupDatabase();