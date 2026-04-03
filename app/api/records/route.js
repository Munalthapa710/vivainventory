import { NextResponse } from "next/server";
import db, { ensureDatabase, logRecord, serializeRecord } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

ensureDatabase();

function buildRecordsQuery({ userId, limit, productId, startDate, endDate }) {
  const conditions = [];
  const parameters = {};

  if (userId) {
    conditions.push("r.user_id = @userId");
    parameters.userId = userId;
  }

  if (productId) {
    conditions.push("r.product_id = @productId");
    parameters.productId = productId;
  }

  if (startDate) {
    conditions.push("date(r.created_at) >= date(@startDate)");
    parameters.startDate = startDate;
  }

  if (endDate) {
    conditions.push("date(r.created_at) <= date(@endDate)");
    parameters.endDate = endDate;
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const limitClause = Number.isInteger(limit) && limit > 0 ? `LIMIT ${limit}` : "";

  const query = `
    SELECT
      r.id,
      r.user_id,
      r.product_id,
      r.action_type,
      r.quantity_changed,
      r.quantity_before,
      r.quantity_after,
      r.notes,
      r.created_at,
      u.full_name AS user_name,
      p.name AS product_name,
      p.category,
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

  const records = db.prepare(query).all(parameters).map(serializeRecord);

  return NextResponse.json({ records });
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
    const notes = body.notes?.trim() || "";
    const userId = Number(session.user.id);

    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        { message: "Product and quantity are required." },
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
        { message: "This product is not assigned to you." },
        { status: 404 }
      );
    }

    if (Number(assignment.remaining_quantity) < quantity) {
      return NextResponse.json(
        { message: "Usage quantity exceeds the remaining stock." },
        { status: 400 }
      );
    }

    const quantityBefore = Number(assignment.remaining_quantity);
    const quantityAfter = quantityBefore - quantity;

    const useProduct = db.transaction(() => {
      db.prepare(`
        UPDATE user_inventory
        SET remaining_quantity = ?
        WHERE id = ?
      `).run(quantityAfter, Number(assignment.id));

      logRecord({
        userId,
        productId,
        actionType: "used",
        quantityChanged: quantity,
        quantityBefore,
        quantityAfter,
        notes
      });
    });

    useProduct();

    return NextResponse.json({
      message: "Product usage recorded successfully."
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to record product usage." },
      { status: 500 }
    );
  }
}
