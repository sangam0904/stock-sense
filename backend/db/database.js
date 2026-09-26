const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(__dirname, 'stocksense.db');

// Compatibility wrapper around sql.js to mimic better-sqlite3 API
class DatabaseWrapper {
  constructor(sqlDb) {
    this._db = sqlDb;
    this._inTransaction = false;
  }

  prepare(sql) {
    const db = this._db;
    const self = this;
    const clean = (arr) => arr.map(v => (v === undefined ? null : v));
    return {
      run(...params) {
        db.run(sql, clean(params));
        const lastId = db.exec('SELECT last_insert_rowid() as id')[0];
        const changesResult = db.exec('SELECT changes() as c')[0];
        if (!self._inTransaction) {
          try { self.save(); } catch (e) {}
        }
        return {
          lastInsertRowid: lastId ? lastId.values[0][0] : 0,
          changes: changesResult ? changesResult.values[0][0] : 0
        };
      },
      get(...params) {
        const stmt = db.prepare(sql);
        stmt.bind(clean(params));
        if (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          stmt.free();
          const row = {};
          cols.forEach((c, i) => row[c] = vals[i]);
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const stmt = db.prepare(sql);
        stmt.bind(clean(params));
        const rows = [];
        const cols = stmt.getColumnNames();
        while (stmt.step()) {
          const vals = stmt.get();
          const row = {};
          cols.forEach((c, i) => row[c] = vals[i]);
          rows.push(row);
        }
        stmt.free();
        return rows;
      }
    };
  }

  exec(sql) {
    this._db.run(sql);
    if (!this._inTransaction) {
      try { this.save(); } catch (e) {}
    }
  }

  pragma(str) {
    try {
      this._db.run(`PRAGMA ${str}`);
    } catch (e) {
      // Ignore pragma errors in sql.js
    }
  }

  transaction(fn) {
    const self = this;
    return function (...args) {
      if (self._inTransaction) {
        return fn.apply(this, args);
      }
      self._inTransaction = true;
      self._db.run('BEGIN TRANSACTION');
      try {
        const result = fn.apply(this, args);
        self._db.run('COMMIT');
        self._inTransaction = false;
        try { self.save(); } catch (e) {}
        return result;
      } catch (e) {
        try { self._db.run('ROLLBACK'); } catch (err) {}
        self._inTransaction = false;
        throw e;
      }
    };
  }

  // Save to disk
  save() {
    if (this._inTransaction) return;
    const data = this._db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }

  close() {
    this.save();
    this._db.close();
  }
}

let dbWrapper = null;

function getDb() {
  if (dbWrapper) return dbWrapper;
  throw new Error('Database not initialized. Call initDb() first.');
}

async function initDb() {
  if (dbWrapper) return dbWrapper;

  const SQL = await initSqlJs();

  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  dbWrapper = new DatabaseWrapper(sqlDb);

  // Enable foreign keys
  dbWrapper.pragma('foreign_keys = ON');

  // Create tables
  dbWrapper.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      otp TEXT,
      otp_expiry TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      unit_of_measure TEXT DEFAULT 'Units',
      reorder_level INTEGER DEFAULT 10,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER REFERENCES products(id),
      warehouse_id INTEGER REFERENCES warehouses(id),
      quantity REAL DEFAULT 0,
      UNIQUE(product_id, warehouse_id)
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT UNIQUE NOT NULL,
      supplier TEXT,
      warehouse_id INTEGER REFERENCES warehouses(id),
      status TEXT DEFAULT 'draft',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      validated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS receipt_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id INTEGER REFERENCES receipts(id),
      product_id INTEGER REFERENCES products(id),
      quantity_expected REAL DEFAULT 0,
      quantity_received REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT UNIQUE NOT NULL,
      customer TEXT,
      warehouse_id INTEGER REFERENCES warehouses(id),
      status TEXT DEFAULT 'draft',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      validated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS delivery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_id INTEGER REFERENCES deliveries(id),
      product_id INTEGER REFERENCES products(id),
      quantity_ordered REAL DEFAULT 0,
      quantity_delivered REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT UNIQUE NOT NULL,
      from_warehouse_id INTEGER REFERENCES warehouses(id),
      to_warehouse_id INTEGER REFERENCES warehouses(id),
      status TEXT DEFAULT 'draft',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS transfer_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_id INTEGER REFERENCES transfers(id),
      product_id INTEGER REFERENCES products(id),
      quantity REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT UNIQUE NOT NULL,
      warehouse_id INTEGER REFERENCES warehouses(id),
      reason TEXT,
      status TEXT DEFAULT 'draft',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS adjustment_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      adjustment_id INTEGER REFERENCES adjustments(id),
      product_id INTEGER REFERENCES products(id),
      recorded_qty REAL DEFAULT 0,
      counted_qty REAL DEFAULT 0,
      difference REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS stock_moves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER REFERENCES products(id),
      warehouse_id INTEGER REFERENCES warehouses(id),
      move_type TEXT NOT NULL,
      reference TEXT,
      quantity REAL DEFAULT 0,
      balance_after REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migrate users table with profile fields
  const userCols = dbWrapper.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  if (!userCols.includes('avatar')) dbWrapper.exec('ALTER TABLE users ADD COLUMN avatar TEXT');
  if (!userCols.includes('role')) dbWrapper.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'Inventory Manager'");
  if (!userCols.includes('department')) dbWrapper.exec("ALTER TABLE users ADD COLUMN department TEXT DEFAULT 'Logistics & Supply'");
  if (!userCols.includes('phone')) dbWrapper.exec('ALTER TABLE users ADD COLUMN phone TEXT');
  if (!userCols.includes('primary_warehouse_id')) dbWrapper.exec('ALTER TABLE users ADD COLUMN primary_warehouse_id INTEGER');
  if (!userCols.includes('bio')) dbWrapper.exec('ALTER TABLE users ADD COLUMN bio TEXT');

  // Insert default data if empty
  const whCount = dbWrapper.prepare('SELECT COUNT(*) as count FROM warehouses').get();
  if (whCount.count === 0) {
    const insertWh = dbWrapper.prepare('INSERT INTO warehouses (name, location) VALUES (?, ?)');
    insertWh.run('Main Warehouse', 'Building A');
    insertWh.run('Secondary Warehouse', 'Building B');
  }

  const catCount = dbWrapper.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (catCount.count === 0) {
    const insertCat = dbWrapper.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
    insertCat.run('Electronics', 'Electronic devices and components');
    insertCat.run('Raw Materials', 'Basic materials for production');
    insertCat.run('Finished Goods', 'Completed products ready for sale');
  }

  // Save initial state
  dbWrapper.save();

  // Auto-save every 5 seconds
  setInterval(() => {
    try { dbWrapper.save(); } catch (e) { /* ignore */ }
  }, 5000);

  return dbWrapper;
}

// Proxy that lazily delegates to the initialized wrapper
const dbProxy = new Proxy({}, {
  get(_, prop) {
    if (prop === 'initDb') return initDb;
    if (prop === 'getDb') return getDb;
    const wrapper = getDb();
    const val = wrapper[prop];
    if (typeof val === 'function') return val.bind(wrapper);
    return val;
  }
});

module.exports = dbProxy;
module.exports.initDb = initDb;
