import { NextResponse } from "next/server";
import db, {
  ensureDatabase,
  logRecord,
  sanitizeUser,
  serializeInventoryItem
} from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

ensureDatabase();

function getEmployeeById(userId) {
  return db.prepare(`
    SELECT id, full_name, email, role, is_active, created_at
    FROM users
    WHERE id = ?
  `).get(userId);
}

function getInventoryForUser(userId) {
  return db
    .prepare(`
      SELECT
        ui.id,
        ui.user_id,
        ui.product_id,
        ui.assigned_quantity,
        ui.remaining_quantity,
        ui.assigned_at,
        p.name,
        p.category,
        p.unit,
        p.description,
        p.low_stock_threshold
      FROM user_inventory ui
      INNER JOIN products p ON p.id = ui.product_id
      WHERE ui.user_id = ?
      ORDER BY p.name COLLATE NOCASE ASC
    `)
    .all(userId)
    .map(serializeInventoryItem);
}

export async function GET(_request, { params }) {
  const { response } = await requireSession("admin");

  if (response) {
    return response;
  }

  const userId = Number(params.userId);
  const employee = getEmployeeById(userId);

  if (!employee || employee.role !== "employee") {
    return NextResponse.json(
      { message: "Employee not found." },
      { status: 404 }
    );
  }

  const inventory = getInventoryForUser(userId);

  return NextResponse.json({
    employee: sanitizeUser(employee),
    products: inventory,
    summary: {
      totalAssignedProducts: inventory.length,
      totalRemainingUnits: inventory.reduce(
        (sum, item) => sum + item.remaining_quantity,
        0
      )
    }
  });
}

export async function POST(request, { params }) {
  const { response } = await requireSession("admin");

  if (response) {
    return response;
  }

  try {
    const userId = Number(params.userId);
    const employee = getEmployeeById(userId);

    if (!employee || employee.role !== "employee") {
      return NextResponse.json(
        { message: "Employee not found." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const productId = Number(body.productId);
    const quantity = Number(body.quantity);

    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        { message: "Product and quantity are required." },
        { status: 400 }
      );
    }

    const product = db
      .prepare(`
        SELECT id, name, total_quantity
        FROM products
        WHERE id = ?
      `)
      .get(productId);

    if (!product) {
      return NextResponse.json(
        { message: "Warehouse product not found." },
        { status: 404 }
      );
    }

    if (Number(product.total_quantity) < quantity) {
      return NextResponse.json(
        { message: "Not enough stock available in warehouse." },
        { status: 400 }
      );
    }

    const assignProduct = db.transaction(() => {
      const existing = db
        .prepare(`
          SELECT id, assigned_quantity, remaining_quantity
          FROM user_inventory
          WHERE user_id = ? AND product_id = ?
        `)
        .get(userId, productId);

      if (existing) {
        const updatedAssigned = Number(existing.assigned_quantity) + quantity;
        const updatedRemaining = Number(existing.remaining_quantity) + quantity;

        db.prepare(`
          UPDATE user_inventory
          SET assigned_quantity = ?, remaining_quantity = ?
          WHERE id = ?
        `).run(updatedAssigned, updatedRemaining, Number(existing.id));

        logRecord({
          userId,
          productId,
          actionType: "assigned",
          quantityChanged: quantity,
          quantityBefore: Number(existing.remaining_quantity),
          quantityAfter: updatedRemaining,
          notes: body.notes || "Admin increased employee allocation."
        });
      } else {
        db.prepare(`
          INSERT INTO user_inventory (
            user_id,
            product_id,
            assigned_quantity,
            remaining_quantity,
            assigned_at
          )
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(userId, productId, quantity, quantity);

        logRecord({
          userId,
          productId,
          actionType: "assigned",
          quantityChanged: quantity,
          quantityBefore: 0,
          quantityAfter: quantity,
          notes: body.notes || "Admin assigned warehouse stock."
        });
      }

      db.prepare(`
        UPDATE products
        SET total_quantity = total_quantity - ?
        WHERE id = ?
      `).run(quantity, productId);
    });

    assignProduct();

    return NextResponse.json({
      message: "Product assigned successfully.",
      products: getInventoryForUser(userId)
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to assign product." },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  const { response } = await requireSession("admin");

  if (response) {
    return response;
  }

  try {
    const userId = Number(params.userId);
    const employee = getEmployeeById(userId);

    if (!employee || employee.role !== "employee") {
      return NextResponse.json(
        { message: "Employee not found." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const productId = Number(body.productId);
    const newAssignedQuantity = Number(body.quantity);

    if (
      !Number.isInteger(productId) ||
      !Number.isInteger(newAssignedQuantity) ||
      newAssignedQuantity <= 0
    ) {
      return NextResponse.json(
        { message: "A valid quantity is required." },
        { status: 400 }
      );
    }

    const assignment = db
      .prepare(`
        SELECT id, assigned_quantity, remaining_quantity
        FROM user_inventory
        WHERE user_id = ? AND product_id = ?
      `)
      .get(userId, productId);

    if (!assignment) {
      return NextResponse.json(
        { message: "Assigned inventory item not found." },
        { status: 404 }
      );
    }

    const product = db
      .prepare(`
        SELECT id, total_quantity
        FROM products
        WHERE id = ?
      `)
      .get(productId);

    const usedQuantity =
      Number(assignment.assigned_quantity) - Number(assignment.remaining_quantity);

    if (newAssignedQuantity < usedQuantity) {
      return NextResponse.json(
        {
          message:
            "New quantity cannot be less than what the employee has already used."
        },
        { status: 400 }
      );
    }

    const delta = newAssignedQuantity - Number(assignment.assigned_quantity);

    if (delta > 0 && Number(product.total_quantity) < delta) {
      return NextResponse.json(
        { message: "Not enough warehouse stock available for this increase." },
        { status: 400 }
      );
    }

    const newRemainingQuantity = newAssignedQuantity - usedQuantity;

    const updateAssignment = db.transaction(() => {
      db.prepare(`
        UPDATE user_inventory
        SET assigned_quantity = ?, remaining_quantity = ?
        WHERE id = ?
      `).run(newAssignedQuantity, newRemainingQuantity, Number(assignment.id));

      db.prepare(`
        UPDATE products
        SET total_quantity = total_quantity - ?
        WHERE id = ?
      `).run(delta, productId);

      if (delta !== 0) {
        logRecord({
          userId,
          productId,
          actionType: "adjusted",
          quantityChanged: Math.abs(delta),
          quantityBefore: Number(assignment.remaining_quantity),
          quantityAfter: newRemainingQuantity,
          notes:
            delta > 0
              ? "Admin increased employee allocation."
              : "Admin reduced employee allocation."
        });
      }
    });

    updateAssignment();

    return NextResponse.json({
      message: "Assigned quantity updated successfully.",
      products: getInventoryForUser(userId)
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to update assigned quantity." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const { response } = await requireSession("admin");

  if (response) {
    return response;
  }

  try {
    const userId = Number(params.userId);
    const employee = getEmployeeById(userId);

    if (!employee || employee.role !== "employee") {
      return NextResponse.json(
        { message: "Employee not found." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const productId = Number(body.productId);

    const assignment = db
      .prepare(`
        SELECT id, remaining_quantity
        FROM user_inventory
        WHERE user_id = ? AND product_id = ?
      `)
      .get(userId, productId);

    if (!assignment) {
      return NextResponse.json(
        { message: "Assigned inventory item not found." },
        { status: 404 }
      );
    }

    const removeAssignment = db.transaction(() => {
      db.prepare(`
        UPDATE products
        SET total_quantity = total_quantity + ?
        WHERE id = ?
      `).run(Number(assignment.remaining_quantity), productId);

      logRecord({
        userId,
        productId,
        actionType: "removed",
        quantityChanged: Number(assignment.remaining_quantity),
        quantityBefore: Number(assignment.remaining_quantity),
        quantityAfter: 0,
        notes: "Admin removed this product from the employee."
      });

      db.prepare("DELETE FROM user_inventory WHERE id = ?").run(Number(assignment.id));
    });

    removeAssignment();

    return NextResponse.json({
      message: "Assigned product removed successfully.",
      products: getInventoryForUser(userId)
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to remove assigned product." },
      { status: 500 }
    );
  }
}
