import { NextResponse } from "next/server";
import {
  queryOne,
  queryRows,
  sanitizeUser,
  serializeInventoryItem
} from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { session, response } = await requireSession("employee");

  if (response) {
    return response;
  }

  const employee = await queryOne(
    `
      SELECT id, full_name, email, role, is_active, created_at
      FROM users
      WHERE id = $1
    `,
    [Number(session.user.id)]
  );

  const products = (
    await queryRows(
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
      [Number(session.user.id)]
    )
  ).map(serializeInventoryItem);

  return NextResponse.json({
    employee: sanitizeUser(employee),
    products,
    totalProducts: products.length,
    lowStockCount: products.filter((item) => item.low_stock).length,
    totalRemaining: products.reduce(
      (sum, item) => sum + item.remaining_quantity,
      0
    )
  });
}
