const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

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

  return db;
}

module.exports = {
  openDatabase
};