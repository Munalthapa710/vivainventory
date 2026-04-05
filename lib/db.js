import pg from "pg";

const { Pool } = pg;
const globalScope = globalThis;

function getPoolConfig() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  if (!connectionString) {
    throw new Error(
      "A database connection string is not configured. Set DATABASE_URL or Vercel Postgres variables before using the database."
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
          must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
          password_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS products (
          id BIGSERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          sku TEXT,
          barcode TEXT,
          category TEXT NOT NULL,
          total_quantity INTEGER NOT NULL DEFAULT 0,
          unit TEXT NOT NULL,
          storage_location TEXT,
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
          reason_code TEXT,
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

        CREATE TABLE IF NOT EXISTS chat_messages (
          id BIGSERIAL PRIMARY KEY,
          sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          recipient_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
          conversation_type TEXT NOT NULL CHECK (conversation_type IN ('group', 'direct')),
          body TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS user_presence (
          user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS conversation_reads (
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          conversation_key TEXT NOT NULL,
          conversation_type TEXT NOT NULL CHECK (conversation_type IN ('group', 'direct')),
          other_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
          last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (user_id, conversation_key)
        );

        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMPTZ;

        UPDATE users
        SET password_updated_at = COALESCE(password_updated_at, created_at, NOW())
        WHERE password_updated_at IS NULL;

        ALTER TABLE users
        ALTER COLUMN password_updated_at SET DEFAULT NOW();

        ALTER TABLE users
        ALTER COLUMN password_updated_at SET NOT NULL;

        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS sku TEXT;

        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS barcode TEXT;

        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS storage_location TEXT;

        UPDATE products
        SET sku = CONCAT('SKU-', LPAD(id::text, 5, '0'))
        WHERE sku IS NULL OR TRIM(sku) = '';

        UPDATE products
        SET barcode = NULLIF(TRIM(barcode), '')
        WHERE barcode IS NOT NULL;

        UPDATE products
        SET storage_location = 'Main Warehouse'
        WHERE storage_location IS NULL OR TRIM(storage_location) = '';

        ALTER TABLE products
        ALTER COLUMN sku SET NOT NULL;

        ALTER TABLE products
        ALTER COLUMN storage_location SET DEFAULT 'Main Warehouse';

        ALTER TABLE products
        ALTER COLUMN storage_location SET NOT NULL;

        ALTER TABLE records
        ADD COLUMN IF NOT EXISTS reason_code TEXT;

        UPDATE records
        SET reason_code = CASE
          WHEN action_type = 'assigned' THEN 'warehouse_allocation'
          WHEN action_type = 'adjusted' THEN 'allocation_adjustment'
          WHEN action_type = 'removed' THEN 'returned_to_warehouse'
          WHEN action_type = 'used' THEN 'project_use'
          ELSE 'general'
        END
        WHERE reason_code IS NULL OR TRIM(reason_code) = '';

        ALTER TABLE records
        ALTER COLUMN reason_code SET DEFAULT 'general';

        ALTER TABLE records
        ALTER COLUMN reason_code SET NOT NULL;

        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_must_change_password ON users(must_change_password);
        CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_unique ON products ((LOWER(sku)));
        CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique ON products ((LOWER(barcode))) WHERE barcode IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_products_storage_location ON products(storage_location);
        CREATE INDEX IF NOT EXISTS idx_inventory_user ON user_inventory(user_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_product ON user_inventory(product_id);
        CREATE INDEX IF NOT EXISTS idx_records_user ON records(user_id);
        CREATE INDEX IF NOT EXISTS idx_records_product ON records(product_id);
        CREATE INDEX IF NOT EXISTS idx_records_reason_code ON records(reason_code);
        CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient ON chat_messages(recipient_user_id);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_type ON chat_messages(conversation_type);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen_at ON user_presence(last_seen_at DESC);
        CREATE INDEX IF NOT EXISTS idx_conversation_reads_user ON conversation_reads(user_id);
        CREATE INDEX IF NOT EXISTS idx_conversation_reads_other_user ON conversation_reads(other_user_id);
        CREATE INDEX IF NOT EXISTS idx_conversation_reads_last_read_at ON conversation_reads(last_read_at DESC);
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
    must_change_password: Boolean(user.must_change_password),
    password_updated_at: serializeDate(user.password_updated_at),
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
    sku: product.sku,
    barcode: product.barcode || null,
    storage_location: product.storage_location,
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

  const assignedQuantity = Number(item.assigned_quantity);
  const remainingQuantity = Number(item.remaining_quantity);
  const lowStockThreshold = Number(item.low_stock_threshold || 0);
  const usedQuantity = Math.max(0, assignedQuantity - remainingQuantity);

  return {
    ...item,
    id: Number(item.id),
    product_id: Number(item.product_id),
    user_id: Number(item.user_id),
    sku: item.sku,
    barcode: item.barcode || null,
    storage_location: item.storage_location,
    assigned_quantity: assignedQuantity,
    used_quantity: usedQuantity,
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
  reasonCode = "general",
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
        reason_code,
        quantity_changed,
        quantity_before,
        quantity_after,
        notes,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `,
    [
      userId,
      productId,
      actionType,
      reasonCode,
      quantityChanged,
      quantityBefore,
      quantityAfter,
      notes?.trim() || null
    ],
    client
  );
}
