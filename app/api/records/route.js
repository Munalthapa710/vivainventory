import { NextResponse } from "next/server";
import {
  logRecord,
  queryOne,
  queryRows,
  serializeRecord,
  withTransaction
} from "@/lib/db";
import { requireSession } from "@/lib/auth";
import {
  getDefaultMovementReason,
  isValidMovementAction,
  isValidMovementReason
} from "@/lib/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildRecordsQuery({ userId, limit, productId, startDate, endDate }) {
  const conditions = [];
  const parameters = [];

  if (userId) {
    parameters.push(userId);
    conditions.push(`r.user_id = $${parameters.length}`);
  }

  if (productId) {
    parameters.push(productId);
    conditions.push(`r.product_id = $${parameters.length}`);
  }

  if (startDate) {
    parameters.push(startDate);
    conditions.push(`DATE(r.created_at) >= $${parameters.length}::date`);
  }

  if (endDate) {
    parameters.push(endDate);
    conditions.push(`DATE(r.created_at) <= $${parameters.length}::date`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  let limitClause = "";

  if (Number.isInteger(limit) && limit > 0) {
    parameters.push(limit);
    limitClause = `LIMIT $${parameters.length}`;
  }

  const query = `
    SELECT
      r.id,
      r.user_id,
      r.product_id,
      r.action_type,
      r.reason_code,
      r.quantity_changed,
      r.quantity_before,
      r.quantity_after,
      r.notes,
      r.created_at,
      u.full_name AS user_name,
      p.name AS product_name,
      p.sku,
      p.barcode,
      p.category,
      p.storage_location,
      p.unit
    FROM records r
    INNER JOIN users u ON u.id = r.user_id
    INNER JOIN products p ON p.id = r.product_id
    ${whereClause}
    ORDER BY r.created_at DESC
    ${limitClause}
  `;

  return { query, parameters };
}

async function getAvailableProducts(user) {
  if (user.role !== "employee") {
    return [];
  }

  const rows = await queryRows(
    `
      SELECT DISTINCT
        p.id AS product_id,
        p.name,
        p.sku
      FROM (
        SELECT product_id
        FROM user_inventory
        WHERE user_id = $1

        UNION

        SELECT product_id
        FROM records
        WHERE user_id = $1
      ) inventory_products
      INNER JOIN products p ON p.id = inventory_products.product_id
      ORDER BY LOWER(p.name) ASC
    `,
    [Number(user.id)]
  );

  return rows.map((row) => ({
    product_id: Number(row.product_id),
    name: row.name,
    sku: row.sku
  }));
}

export async function GET(request) {
  const { session, response } = await requireSession();

  if (response) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const limitValue = Number(searchParams.get("limit"));
  const limit = Number.isInteger(limitValue) ? limitValue : null;
  const productIdValue = Number(searchParams.get("productId"));
  const productId =
    Number.isInteger(productIdValue) && productIdValue > 0 ? productIdValue : null;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const { query, parameters } = buildRecordsQuery({
    userId: session.user.role === "employee" ? Number(session.user.id) : null,
    limit,
    productId,
    startDate,
    endDate
  });

  const records = (await queryRows(query, parameters)).map(serializeRecord);
  const availableProducts = await getAvailableProducts(session.user);

  return NextResponse.json({ records, availableProducts });
}

export async function POST(request) {
  const { session, response } = await requireSession("employee");

  if (response) {
    return response;
  }

  try {
    const body = await request.json();
    const productId = Number(body.productId);
    const quantity = Number(body.quantity);
    const actionType = isValidMovementAction(body.actionType)
      ? body.actionType
      : "used";
    const reasonCode = body.reasonCode?.trim() || getDefaultMovementReason(actionType);
    const notes = body.notes?.trim() || "";
    const userId = Number(session.user.id);

    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        { message: "Product and quantity are required." },
        { status: 400 }
      );
    }

    if (!isValidMovementReason(actionType, reasonCode)) {
      return NextResponse.json(
        { message: "Select a valid movement reason." },
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
        { message: "This product is not assigned to you." },
        { status: 404 }
      );
    }

    if (Number(assignment.remaining_quantity) < quantity) {
      return NextResponse.json(
        { message: "Requested quantity exceeds the remaining stock." },
        { status: 400 }
      );
    }

    const quantityBefore = Number(assignment.remaining_quantity);
    const assignedBefore = Number(assignment.assigned_quantity);
    const quantityAfter = quantityBefore - quantity;
    let assignedAfter = assignedBefore;
    let warehouseDelta = 0;

    if (actionType === "returned" || actionType === "damaged") {
      assignedAfter = assignedBefore - quantity;
    }

    if (assignedAfter < 0 || quantityAfter < 0) {
      return NextResponse.json(
        { message: "This movement would create an invalid stock balance." },
        { status: 400 }
      );
    }

    if (actionType === "returned") {
      warehouseDelta = quantity;
    }

    await withTransaction(async (client) => {
      if (assignedAfter === 0 && quantityAfter === 0) {
        await client.query("DELETE FROM user_inventory WHERE id = $1", [
          Number(assignment.id)
        ]);
      } else {
        await client.query(
          `
            UPDATE user_inventory
            SET assigned_quantity = $1, remaining_quantity = $2
            WHERE id = $3
          `,
          [assignedAfter, quantityAfter, Number(assignment.id)]
        );
      }

      if (warehouseDelta > 0) {
        await client.query(
          `
            UPDATE products
            SET total_quantity = total_quantity + $1
            WHERE id = $2
          `,
          [warehouseDelta, productId]
        );
      }

      await logRecord(
        {
          userId,
          productId,
          actionType,
          reasonCode,
          quantityChanged: quantity,
          quantityBefore,
          quantityAfter,
          notes
        },
        client
      );
    });

    return NextResponse.json({
      message:
        actionType === "returned"
          ? "Product return recorded successfully."
          : actionType === "damaged"
            ? "Damaged stock recorded successfully."
            : "Product usage recorded successfully."
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to record product usage." },
      { status: 500 }
    );
  }
}
