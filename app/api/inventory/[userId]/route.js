import { NextResponse } from "next/server";
import {
  logRecord,
  queryOne,
  queryRows,
  sanitizeUser,
  serializeInventoryItem,
  withTransaction
} from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { SYSTEM_REASON_CODES } from "@/lib/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getEmployeeById(userId, client) {
  return queryOne(
    `
      SELECT id, full_name, email, role, is_active, created_at
      FROM users
      WHERE id = $1
    `,
    [userId],
    client
  );
}

async function getInventoryForUser(userId, client) {
  const rows = await queryRows(
    `
      SELECT
        ui.id,
        ui.user_id,
        ui.product_id,
        ui.assigned_quantity,
        ui.remaining_quantity,
        ui.assigned_at,
        p.name,
        p.sku,
        p.barcode,
        p.category,
        p.unit,
        p.storage_location,
        p.description,
        p.low_stock_threshold
      FROM user_inventory ui
      INNER JOIN products p ON p.id = ui.product_id
      WHERE ui.user_id = $1
      ORDER BY LOWER(p.name) ASC
    `,
    [userId],
    client
  );

  return rows.map(serializeInventoryItem);
}

export async function GET(_request, { params }) {
  const { response } = await requireSession("admin");

  if (response) {
    return response;
  }

  const userId = Number(params.userId);
  const employee = await getEmployeeById(userId);

  if (!employee || employee.role !== "employee") {
    return NextResponse.json(
      { message: "Employee not found." },
      { status: 404 }
    );
  }

  const inventory = await getInventoryForUser(userId);

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
    const employee = await getEmployeeById(userId);

    if (!employee || employee.role !== "employee") {
      return NextResponse.json(
        { message: "Employee not found." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const productId = Number(body.productId);
    const quantity = Number(body.quantity);
    const notes = body.notes?.trim() || "Admin assigned warehouse stock.";

    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        { message: "Product and quantity are required." },
        { status: 400 }
      );
    }

    const product = await queryOne(
      `
        SELECT id, name, total_quantity
        FROM products
        WHERE id = $1
      `,
      [productId]
    );

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

    await withTransaction(async (client) => {
      const existing = await queryOne(
        `
          SELECT id, assigned_quantity, remaining_quantity
          FROM user_inventory
          WHERE user_id = $1 AND product_id = $2
        `,
        [userId, productId],
        client
      );

      if (existing) {
        const updatedAssigned = Number(existing.assigned_quantity) + quantity;
        const updatedRemaining = Number(existing.remaining_quantity) + quantity;

        await client.query(
          `
            UPDATE user_inventory
            SET assigned_quantity = $1, remaining_quantity = $2
            WHERE id = $3
          `,
          [updatedAssigned, updatedRemaining, Number(existing.id)]
        );

        await logRecord(
          {
            userId,
            productId,
            actionType: "assigned",
            reasonCode: SYSTEM_REASON_CODES.allocationIncrease,
            quantityChanged: quantity,
            quantityBefore: Number(existing.remaining_quantity),
            quantityAfter: updatedRemaining,
            notes
          },
          client
        );
      } else {
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
          [userId, productId, quantity, quantity]
        );

        await logRecord(
          {
            userId,
            productId,
            actionType: "assigned",
            reasonCode: SYSTEM_REASON_CODES.warehouseAllocation,
            quantityChanged: quantity,
            quantityBefore: 0,
            quantityAfter: quantity,
            notes
          },
          client
        );
      }

      await client.query(
        `
          UPDATE products
          SET total_quantity = total_quantity - $1
          WHERE id = $2
        `,
        [quantity, productId]
      );
    });

    return NextResponse.json({
      message: "Product assigned successfully.",
      products: await getInventoryForUser(userId)
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
    const employee = await getEmployeeById(userId);

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

    const assignment = await queryOne(
      `
        SELECT id, assigned_quantity, remaining_quantity
        FROM user_inventory
        WHERE user_id = $1 AND product_id = $2
      `,
      [userId, productId]
    );

    if (!assignment) {
      return NextResponse.json(
        { message: "Assigned inventory item not found." },
        { status: 404 }
      );
    }

    const product = await queryOne(
      `
        SELECT id, total_quantity
        FROM products
        WHERE id = $1
      `,
      [productId]
    );

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

    await withTransaction(async (client) => {
      await client.query(
        `
          UPDATE user_inventory
          SET assigned_quantity = $1, remaining_quantity = $2
          WHERE id = $3
        `,
        [newAssignedQuantity, newRemainingQuantity, Number(assignment.id)]
      );

      await client.query(
        `
          UPDATE products
          SET total_quantity = total_quantity - $1
          WHERE id = $2
        `,
        [delta, productId]
      );

      if (delta !== 0) {
        await logRecord(
          {
            userId,
            productId,
            actionType: "adjusted",
            reasonCode:
              delta > 0
                ? SYSTEM_REASON_CODES.allocationIncrease
                : SYSTEM_REASON_CODES.allocationReduction,
            quantityChanged: Math.abs(delta),
            quantityBefore: Number(assignment.remaining_quantity),
            quantityAfter: newRemainingQuantity,
            notes:
              delta > 0
                ? "Admin increased employee allocation."
                : "Admin reduced employee allocation."
          },
          client
        );
      }
    });

    return NextResponse.json({
      message: "Assigned quantity updated successfully.",
      products: await getInventoryForUser(userId)
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
    const employee = await getEmployeeById(userId);

    if (!employee || employee.role !== "employee") {
      return NextResponse.json(
        { message: "Employee not found." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const productId = Number(body.productId);

    const assignment = await queryOne(
      `
        SELECT id, remaining_quantity
        FROM user_inventory
        WHERE user_id = $1 AND product_id = $2
      `,
      [userId, productId]
    );

    if (!assignment) {
      return NextResponse.json(
        { message: "Assigned inventory item not found." },
        { status: 404 }
      );
    }

    await withTransaction(async (client) => {
      await client.query(
        `
          UPDATE products
          SET total_quantity = total_quantity + $1
          WHERE id = $2
        `,
        [Number(assignment.remaining_quantity), productId]
      );

      await logRecord(
          {
            userId,
            productId,
            actionType: "removed",
            reasonCode: SYSTEM_REASON_CODES.adminRemoval,
            quantityChanged: Number(assignment.remaining_quantity),
            quantityBefore: Number(assignment.remaining_quantity),
            quantityAfter: 0,
          notes: "Admin removed this product from the employee."
        },
        client
      );

      await client.query(
        "DELETE FROM user_inventory WHERE id = $1",
        [Number(assignment.id)]
      );
    });

    return NextResponse.json({
      message: "Assigned product removed successfully.",
      products: await getInventoryForUser(userId)
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to remove product." },
      { status: 500 }
    );
  }
}
