const db = require('./config/db');

async function migrate() {
  try {
    console.log('Starting migrations...');

    // 1. Add party_symbol column to candidates
    try {
      await db.query(`
        ALTER TABLE candidates ADD COLUMN party_symbol VARCHAR(255) DEFAULT NULL
      `);
      console.log('Column "party_symbol" added to "candidates" table successfully.');
    } catch (err) {
      if (err.code === 'ER_DUP_COLUMN_NAME' || err.code === 'ER_DUP_FIELDNAME' || err.errno === 1060) {
        console.log('Column "party_symbol" already exists in "candidates" table.');
      } else {
        throw err;
      }
    }

    // 1b. Add candidate_photo column to candidates
    try {
      await db.query(`
        ALTER TABLE candidates ADD COLUMN candidate_photo VARCHAR(255) DEFAULT NULL
      `);
      console.log('Column "candidate_photo" added to "candidates" table successfully.');
    } catch (err) {
      if (err.code === 'ER_DUP_COLUMN_NAME' || err.code === 'ER_DUP_FIELDNAME' || err.errno === 1060) {
        console.log('Column "candidate_photo" already exists in "candidates" table.');
      } else {
        throw err;
      }
    }

    // 2. Create otp_codes table
    await db.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        otp VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (email)
      )
    `);
    console.log('Table "otp_codes" created or verified successfully.');

    // 3. Create contact_messages table
    await db.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL,
        subject VARCHAR(200),
        message TEXT NOT NULL,
        status ENUM('unread', 'read') DEFAULT 'unread',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table "contact_messages" created or verified successfully.');

    console.log('Migrations completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
