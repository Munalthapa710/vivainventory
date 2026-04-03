import bcrypt from "bcryptjs";
import {
  ensureDatabase,
  logRecord,
  queryOne,
  queryRows,
  withTransaction
} from "./db.js";

await ensureDatabase();

await withTransaction(async (client) => {
  const seededAccounts = {
    admin: {
      fullName: "VivaInventory Admin",
      email: "admin@vivainventory.com",
      password: "admin123",
      role: "admin"
    },
    employee: {
      fullName: "Rakesh Site Supervisor",
      email: "employee@vivainventory.com",
      password: "employee123",
      role: "employee"
    }
  };

  const admin = await queryOne(
    `
      INSERT INTO users (
        full_name,
        email,
        password_hash,
        role,
        is_active,
        created_at
      )
      VALUES ($1, $2, $3, $4, TRUE, NOW())
      ON CONFLICT (email)
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        is_active = TRUE
      RETURNING id, full_name, email
    `,
    [
      seededAccounts.admin.fullName,
      seededAccounts.admin.email,
      bcrypt.hashSync(seededAccounts.admin.password, 10),
      seededAccounts.admin.role
    ],
    client
  );

  const employee = await queryOne(
    `
      INSERT INTO users (
        full_name,
        email,
        password_hash,
        role,
        is_active,
        created_at
      )
      VALUES ($1, $2, $3, $4, TRUE, NOW())
      ON CONFLICT (email)
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        is_active = TRUE
      RETURNING id, full_name, email
    `,
    [
      seededAccounts.employee.fullName,
      seededAccounts.employee.email,
      bcrypt.hashSync(seededAccounts.employee.password, 10),
      seededAccounts.employee.role
    ],
    client
  );

  const sampleProducts = [
    {
      name: "Cement Bags",
      category: "Materials",
      total_quantity: 240,
      unit: "bags",
      description: "Ordinary Portland cement stock for site delivery.",
      low_stock_threshold: 40
    },
    {
      name: "Safety Helmets",
      category: "Safety",
      total_quantity: 75,
      unit: "pcs",
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
            category,
            total_quantity,
            unit,
            description,
            low_stock_threshold,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `,
        [
          product.name,
          product.category,
          product.total_quantity,
          product.unit,
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
console.log("Admin:", "admin@vivainventory.com / admin123");
console.log("Employee:", "employee@vivainventory.com / employee123");
