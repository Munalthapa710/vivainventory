import Database from "better-sqlite3";
import path from "path";

const globalScope = globalThis;
const databasePath = path.join(process.cwd(), "database.sqlite");

const db =
  globalScope.__vivaInventoryDb || new Database(databasePath);

if (process.env.NODE_ENV !== "production") {
  globalScope.__vivaInventoryDb = db;
}

let initialized = globalScope.__vivaInventoryInitialized || false;

export function ensureDatabase() {
  if (initialized) {
    return db;
  }

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      total_quantity INTEGER NOT NULL DEFAULT 0,
      unit TEXT NOT NULL,
      description TEXT,
      low_stock_threshold INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      assigned_quantity INTEGER NOT NULL,
      remaining_quantity INTEGER NOT NULL,
      assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      quantity_changed INTEGER NOT NULL,
      quantity_before INTEGER NOT NULL,
      quantity_after INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_inventory_user ON user_inventory(user_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_product ON user_inventory(product_id);
    CREATE INDEX IF NOT EXISTS idx_records_user ON records(user_id);
    CREATE INDEX IF NOT EXISTS idx_records_product ON records(product_id);
    CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
  `);

  initialized = true;

  if (process.env.NODE_ENV !== "production") {
    globalScope.__vivaInventoryInitialized = true;
  }

  return db;
}

export function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: Number(user.id),
    full_name: user.full_name,
    name: user.full_name,
    email: user.email,
    role: user.role,
    is_active: Boolean(user.is_active),
    created_at: user.created_at
  };
}

export function serializeProduct(product) {
  if (!product) {
    return null;
  }

  const totalQuantity = Number(product.total_quantity);
  const lowStockThreshold = Number(product.low_stock_threshold);

  return {
    ...product,
    id: Number(product.id),
    total_quantity: totalQuantity,
    low_stock_threshold: lowStockThreshold,
    low_stock: totalQuantity <= lowStockThreshold
  };
}

export function serializeInventoryItem(item) {
  if (!item) {
    return null;
  }

  const remainingQuantity = Number(item.remaining_quantity);
  const lowStockThreshold = Number(item.low_stock_threshold || 0);

  return {
    ...item,
    id: Number(item.id),
    product_id: Number(item.product_id),
    user_id: Number(item.user_id),
    assigned_quantity: Number(item.assigned_quantity),
    remaining_quantity: remainingQuantity,
    low_stock_threshold: lowStockThreshold,
    low_stock: remainingQuantity <= lowStockThreshold
  };
}

export function serializeRecord(record) {
  if (!record) {
    return null;
  }

  return {
    ...record,
    id: Number(record.id),
    user_id: Number(record.user_id),
    product_id: Number(record.product_id),
    quantity_changed: Number(record.quantity_changed),
    quantity_before: Number(record.quantity_before),
    quantity_after: Number(record.quantity_after)
  };
}

export function serializeAnnouncement(announcement) {
  if (!announcement) {
    return null;
  }

  return {
    ...announcement,
    id: Number(announcement.id),
    created_by: announcement.created_by ? Number(announcement.created_by) : null
  };
}

export function logRecord({
  userId,
  productId,
  actionType,
  quantityChanged,
  quantityBefore,
  quantityAfter,
  notes
}) {
  ensureDatabase();

  db.prepare(`
    INSERT INTO records (
      user_id,
      product_id,
      action_type,
      quantity_changed,
      quantity_before,
      quantity_after,
      notes,
      created_at
    )
    VALUES (
      @userId,
      @productId,
      @actionType,
      @quantityChanged,
      @quantityBefore,
      @quantityAfter,
      @notes,
      CURRENT_TIMESTAMP
    )
  `).run({
    userId,
    productId,
    actionType,
    quantityChanged,
    quantityBefore,
    quantityAfter,
    notes: notes?.trim() || null
  });
}

ensureDatabase();

export default db;
