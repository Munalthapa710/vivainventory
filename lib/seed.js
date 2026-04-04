import { defaultAccounts, ensureDefaultAccounts } from "./defaultAccounts.js";
import {
  ensureDatabase,
  logRecord,
  queryOne,
  queryRows,
  withTransaction
} from "./db.js";

await ensureDatabase();
await ensureDefaultAccounts({ resetPassword: true });

await withTransaction(async (client) => {
  const admin = await queryOne(
    `
      SELECT id, full_name, email
      FROM users
      WHERE email = $1
    `,
    [defaultAccounts.admin.email],
    client
  );

  const employee = await queryOne(
    `
      SELECT id, full_name, email
      FROM users
      WHERE email = $1
    `,
    [defaultAccounts.employee.email],
    client
  );

  const sampleProducts = [
    {
      name: "Cement Bags",
      sku: "MAT-CEM-001",
      barcode: "8901000000011",
      category: "Materials",
      total_quantity: 240,
      unit: "bags",
      storage_location: "Main Warehouse A1",
      description: "Ordinary Portland cement stock for site delivery.",
      low_stock_threshold: 40
    },
    {
      name: "Safety Helmets",
      sku: "SAFE-HELM-001",
      barcode: "8901000000028",
      category: "Safety",
      total_quantity: 75,
      unit: "pcs",
      storage_location: "Safety Rack B2",
      description: "Certified safety helmets for field employees.",
      low_stock_threshold: 12
    }
  ];

  for (const product of sampleProducts) {
    const exists = await queryOne(
      "SELECT id FROM products WHERE name = $1",
      [product.name],
      client
    );

    if (!exists) {
      await client.query(
        `
          INSERT INTO products (
            name,
            sku,
            barcode,
            category,
            total_quantity,
            unit,
            storage_location,
            description,
            low_stock_threshold,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        `,
        [
          product.name,
          product.sku,
          product.barcode,
          product.category,
          product.total_quantity,
          product.unit,
          product.storage_location,
          product.description,
          product.low_stock_threshold
        ]
      );
    }
  }

  const helmetProduct = await queryOne(
    "SELECT id, total_quantity FROM products WHERE name = $1",
    ["Safety Helmets"],
    client
  );

  const existingAssignment = await queryOne(
    `
      SELECT id
      FROM user_inventory
      WHERE user_id = $1 AND product_id = $2
    `,
    [employee.id, helmetProduct.id],
    client
  );

  if (!existingAssignment) {
    await client.query(
      `
        INSERT INTO user_inventory (
          user_id,
          product_id,
          assigned_quantity,
          remaining_quantity,
          assigned_at
        )
        VALUES ($1, $2, $3, $4, NOW())
      `,
      [employee.id, helmetProduct.id, 8, 8]
    );

    await client.query(
      `
        UPDATE products
        SET total_quantity = total_quantity - $1
        WHERE id = $2
      `,
      [8, helmetProduct.id]
    );

    await logRecord(
      {
        userId: employee.id,
        productId: helmetProduct.id,
        actionType: "assigned",
        reasonCode: "warehouse_allocation",
        quantityChanged: 8,
        quantityBefore: 0,
        quantityAfter: 8,
        notes: "Initial seeded assignment from warehouse."
      },
      client
    );

    await client.query(
      `
        UPDATE user_inventory
        SET remaining_quantity = 6
        WHERE user_id = $1 AND product_id = $2
      `,
      [employee.id, helmetProduct.id]
    );

    await logRecord(
      {
        userId: employee.id,
        productId: helmetProduct.id,
        actionType: "used",
        reasonCode: "project_use",
        quantityChanged: 2,
        quantityBefore: 8,
        quantityAfter: 6,
        notes: "Seeded sample usage for dashboard activity."
      },
      client
    );
  }

  const announcements = await queryRows(
    "SELECT id FROM announcements LIMIT 1",
    [],
    client
  );

  if (announcements.length === 0) {
    await client.query(
      `
        INSERT INTO announcements (
          title,
          message,
          created_by,
          created_at
        )
        VALUES ($1, $2, $3, NOW())
      `,
      [
        "Morning Dispatch",
        "Check assigned helmets and cement stock before dispatching to the east block.",
        admin.id
      ]
    );
  }
});

console.log("Seed completed.");
