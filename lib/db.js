import pg from "pg";

const { Pool } = pg;
const globalScope = globalThis;

function getPoolConfig() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not configured. Set it in your environment before using the database."
    );
  }

  const isLocalConnection =
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1");

  return {
    connectionString,
    ssl: isLocalConnection ? false : { rejectUnauthorized: false },
    max: 5
  };
}

let pool = globalScope.__vivaInventoryPool || null;

function getPool() {
  if (!pool) {
    pool = new Pool(getPoolConfig());

    if (process.env.NODE_ENV !== "production") {
      globalScope.__vivaInventoryPool = pool;
    }
  }

  return pool;
}

let initializationPromise = globalScope.__vivaInventoryInitialization || null;

export async function ensureDatabase() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      await getPool().query(`
        CREATE TABLE IF NOT EXISTS users (
          id BIGSERIAL PRIMARY KEY,
          full_name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS products (
          id BIGSERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          category TEXT NOT NULL,
          total_quantity INTEGER NOT NULL DEFAULT 0,
          unit TEXT NOT NULL,
          description TEXT,
          low_stock_threshold INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS user_inventory (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          assigned_quantity INTEGER NOT NULL,
          remaining_quantity INTEGER NOT NULL,
          assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(user_id, product_id)
        );

        CREATE TABLE IF NOT EXISTS records (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          action_type TEXT NOT NULL,
          quantity_changed INTEGER NOT NULL,
          quantity_before INTEGER NOT NULL,
          quantity_after INTEGER NOT NULL,
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS announcements (
          id BIGSERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
        CREATE INDEX IF NOT EXISTS idx_inventory_user ON user_inventory(user_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_product ON user_inventory(product_id);
        CREATE INDEX IF NOT EXISTS idx_records_user ON records(user_id);
        CREATE INDEX IF NOT EXISTS idx_records_product ON records(product_id);
        CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
      `);
    })();

    if (process.env.NODE_ENV !== "production") {
      globalScope.__vivaInventoryInitialization = initializationPromise;
    }
  }

  try {
    await initializationPromise;
  } catch (error) {
    initializationPromise = null;

    if (process.env.NODE_ENV !== "production") {
      globalScope.__vivaInventoryInitialization = null;
    }

    throw error;
  }

  return pool;
}

export async function query(text, params = [], client = pool) {
  await ensureDatabase();

  if (client) {
    return client.query(text, params);
  }

  return getPool().query(text, params);
}

export async function queryRows(text, params = [], client) {
  const result = await query(text, params, client);
  return result.rows;
}

export async function queryOne(text, params = [], client) {
  const rows = await queryRows(text, params, client);
  return rows[0] || null;
}

export async function withTransaction(callback) {
  await ensureDatabase();

  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function serializeDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
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
    created_at: serializeDate(user.created_at)
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
    low_stock: totalQuantity <= lowStockThreshold,
    created_at: serializeDate(product.created_at)
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
    low_stock: remainingQuantity <= lowStockThreshold,
    assigned_at: serializeDate(item.assigned_at)
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
    quantity_after: Number(record.quantity_after),
    created_at: serializeDate(record.created_at)
  };
}

export function serializeAnnouncement(announcement) {
  if (!announcement) {
    return null;
  }

  return {
    ...announcement,
    id: Number(announcement.id),
    created_by: announcement.created_by ? Number(announcement.created_by) : null,
    created_at: serializeDate(announcement.created_at)
  };
}

export async function logRecord({
  userId,
  productId,
  actionType,
  quantityChanged,
  quantityBefore,
  quantityAfter,
  notes
}, client) {
  await query(
    `
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `,
    [
      userId,
      productId,
      actionType,
      quantityChanged,
      quantityBefore,
      quantityAfter,
      notes?.trim() || null
    ],
    client
  );
}
