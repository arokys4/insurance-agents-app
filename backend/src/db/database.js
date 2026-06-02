const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');

async function addColumnIfNotExists(db, tableName, columnName, columnDefinition) {
  const columns = await db.all(`PRAGMA table_info(${tableName})`);
  const columnExists = columns.some((column) => column.name === columnName);

  if (!columnExists) {
    await db.exec(`
      ALTER TABLE ${tableName}
      ADD COLUMN ${columnName} ${columnDefinition}
    `);
  }
}

async function createDefaultAdmin(db) {
  const adminEmail = 'admin@firma.pl';

  const existingAdmin = await db.get(
    `
    SELECT id
    FROM agents
    WHERE email = ?
    `,
    [adminEmail]
  );

  if (existingAdmin) {
    return;
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);

  await db.run(
    `
    INSERT INTO agents (
      first_name,
      last_name,
      email,
      phone,
      status,
      password,
      role,
      must_change_password
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      'Administrator',
      'Systemu',
      adminEmail,
      '000000000',
      'Aktywny',
      hashedPassword,
      'ADMIN',
      0
    ]
  );

  console.log('Utworzono domyślne konto administratora: admin@firma.pl / admin123');
}

async function openDatabase() {
  const db = await open({
    filename: './data/app.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Aktywny'
    );
  `);

  await addColumnIfNotExists(db, 'agents', 'password', 'TEXT');
  await addColumnIfNotExists(db, 'agents', 'role', "TEXT NOT NULL DEFAULT 'AGENT'");
  await addColumnIfNotExists(db, 'agents', 'must_change_password', 'INTEGER NOT NULL DEFAULT 1');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      meeting_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Zaplanowane',
      agent_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS work_time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL,
      work_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS meeting_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS meeting_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_role TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES agents(id)
    )
  `);

  await createDefaultAdmin(db);

  return db;
}

module.exports = {
  openDatabase
};