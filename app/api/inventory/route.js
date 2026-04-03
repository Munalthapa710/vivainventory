import { NextResponse } from "next/server";
import db, {
  ensureDatabase,
  sanitizeUser,
  serializeInventoryItem
} from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

ensureDatabase();

export async function GET() {
  const { session, response } = await requireSession("employee");

  if (response) {
    return response;
  }

  const employee = db
    .prepare(`
      SELECT id, full_name, email, role, is_active, created_at
      FROM users
      WHERE id = ?
    `)
    .get(Number(session.user.id));

  const products = db
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
    .all(Number(session.user.id))
    .map(serializeInventoryItem);

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
