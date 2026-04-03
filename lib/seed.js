import bcrypt from "bcryptjs";
import db, { ensureDatabase, logRecord } from "./db.js";

ensureDatabase();

const seed = db.transaction(() => {
  const adminEmail = "admin@vivainventory.com";
  const employeeEmail = "employee@vivainventory.com";

  let admin = db
    .prepare("SELECT id, full_name, email FROM users WHERE email = ?")
    .get(adminEmail);

  if (!admin) {
    const adminResult = db
      .prepare(`
        INSERT INTO users (
          full_name,
          email,
          password_hash,
          role,
          is_active,
          created_at
        )
        VALUES (?, ?, ?, 'admin', 1, CURRENT_TIMESTAMP)
      `)
      .run(
        "VivaInventory Admin",
        adminEmail,
        bcrypt.hashSync("admin123", 10)
      );

    admin = {
      id: Number(adminResult.lastInsertRowid),
      full_name: "VivaInventory Admin",
      email: adminEmail
    };
  }

  let employee = db
    .prepare("SELECT id, full_name, email FROM users WHERE email = ?")
    .get(employeeEmail);

  if (!employee) {
    const employeeResult = db
      .prepare(`
        INSERT INTO users (
          full_name,
          email,
          password_hash,
          role,
          is_active,
          created_at
        )
        VALUES (?, ?, ?, 'employee', 1, CURRENT_TIMESTAMP)
      `)
      .run(
        "Rakesh Site Supervisor",
        employeeEmail,
        bcrypt.hashSync("employee123", 10)
      );

    employee = {
      id: Number(employeeResult.lastInsertRowid),
      full_name: "Rakesh Site Supervisor",
      email: employeeEmail
    };
  }

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
    const exists = db
      .prepare("SELECT id FROM products WHERE name = ?")
      .get(product.name);

    if (!exists) {
      db.prepare(`
        INSERT INTO products (
          name,
          category,
          total_quantity,
          unit,
          description,
          low_stock_threshold,
          created_at
        )
        VALUES (
          @name,
          @category,
          @total_quantity,
          @unit,
          @description,
          @low_stock_threshold,
          CURRENT_TIMESTAMP
        )
      `).run(product);
    }
  }

  const helmetProduct = db
    .prepare("SELECT id, total_quantity FROM products WHERE name = ?")
    .get("Safety Helmets");

  const existingAssignment = db
    .prepare(
      "SELECT id FROM user_inventory WHERE user_id = ? AND product_id = ?"
    )
    .get(employee.id, helmetProduct.id);

  if (!existingAssignment) {
    db.prepare(`
      INSERT INTO user_inventory (
        user_id,
        product_id,
        assigned_quantity,
        remaining_quantity,
        assigned_at
      )
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(employee.id, helmetProduct.id, 8, 8);

    db.prepare(`
      UPDATE products
      SET total_quantity = total_quantity - 8
      WHERE id = ?
    `).run(helmetProduct.id);

    logRecord({
      userId: employee.id,
      productId: helmetProduct.id,
      actionType: "assigned",
      quantityChanged: 8,
      quantityBefore: 0,
      quantityAfter: 8,
      notes: "Initial seeded assignment from warehouse."
    });

    db.prepare(`
      UPDATE user_inventory
      SET remaining_quantity = 6
      WHERE user_id = ? AND product_id = ?
    `).run(employee.id, helmetProduct.id);

    logRecord({
      userId: employee.id,
      productId: helmetProduct.id,
      actionType: "used",
      quantityChanged: 2,
      quantityBefore: 8,
      quantityAfter: 6,
      notes: "Seeded sample usage for dashboard activity."
    });
  }

  const hasAnnouncement = db
    .prepare("SELECT id FROM announcements LIMIT 1")
    .get();

  if (!hasAnnouncement) {
    db.prepare(`
      INSERT INTO announcements (
        title,
        message,
        created_by,
        created_at
      )
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      "Morning Dispatch",
      "Check assigned helmets and cement stock before dispatching to the east block.",
      admin.id
    );
  }
});

seed();

console.log("Seed completed.");
console.log("Admin:", "admin@vivainventory.com / admin123");
console.log("Employee:", "employee@vivainventory.com / employee123");
