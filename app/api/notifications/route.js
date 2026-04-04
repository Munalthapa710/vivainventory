import { NextResponse } from "next/server";
import { queryOne, queryRows } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeNotification(notification) {
  return {
    ...notification,
    created_at: notification.created_at
      ? new Date(notification.created_at).toISOString()
      : new Date().toISOString()
  };
}

export async function GET() {
  const { session, response } = await requireSession();

  if (response) {
    return response;
  }

  const userId = Number(session.user.id);
  const notifications = [];
  const currentUser = await queryOne(
    `
      SELECT created_at, password_updated_at
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  if (session.user.mustChangePassword) {
    notifications.push(
      serializeNotification({
        id: "password-update-required",
        type: "security",
        severity: "high",
        title: "Password update required",
        description:
          "This account is using a temporary password. Open settings to finish setup.",
        href: `/${session.user.role}/settings?forcePasswordChange=1`,
        created_at:
          currentUser?.password_updated_at ||
          currentUser?.created_at ||
          new Date().toISOString()
      })
    );
  }

  const announcements = await queryRows(
    `
      SELECT id, title, message, created_at
      FROM announcements
      ORDER BY created_at DESC
      LIMIT 4
    `
  );

  if (session.user.role === "admin") {
    const lowStockProducts = await queryRows(
      `
        SELECT
          p.id,
          p.name,
          p.total_quantity,
          p.low_stock_threshold,
          COALESCE(MAX(r.created_at), p.created_at) AS created_at
        FROM products p
        LEFT JOIN records r ON r.product_id = p.id
        WHERE p.total_quantity <= p.low_stock_threshold
        GROUP BY p.id, p.name, p.total_quantity, p.low_stock_threshold, p.created_at
        ORDER BY created_at DESC
        LIMIT 4
      `
    );

    const recentUsage = await queryRows(
      `
        SELECT
          r.id,
          r.created_at,
          r.quantity_changed,
          r.quantity_after,
          u.full_name AS user_name,
          p.name AS product_name
        FROM records r
        INNER JOIN users u ON u.id = r.user_id
        INNER JOIN products p ON p.id = r.product_id
        ORDER BY r.created_at DESC
        LIMIT 4
      `
    );

    notifications.push(
      ...lowStockProducts.map((product) =>
        serializeNotification({
          id: `warehouse-low-stock-${product.id}`,
          type: "low_stock",
          severity: "high",
          title: `${product.name} is low in warehouse`,
          description: `${Number(product.total_quantity)} units left against a threshold of ${Number(product.low_stock_threshold)}.`,
          href: "/admin/warehouse",
          created_at: product.created_at
        })
      ),
      ...recentUsage.map((record) =>
        serializeNotification({
          id: `recent-record-${record.id}`,
          type: "activity",
          severity: "normal",
          title: `${record.user_name} updated ${record.product_name}`,
          description: `${Number(record.quantity_changed)} units moved. ${Number(record.quantity_after)} remaining after the latest action.`,
          href: "/admin/dashboard",
          created_at: record.created_at
        })
      ),
      ...announcements.map((announcement) =>
        serializeNotification({
          id: `announcement-${announcement.id}`,
          type: "announcement",
          severity: "normal",
          title: announcement.title,
          description: announcement.message,
          href: "/admin/dashboard",
          created_at: announcement.created_at
        })
      )
    );
  } else {
    const lowStockAssignments = await queryRows(
      `
        SELECT
          p.id,
          p.name,
          p.low_stock_threshold,
          ui.remaining_quantity,
          COALESCE(MAX(r.created_at), ui.assigned_at) AS created_at
        FROM user_inventory ui
        INNER JOIN products p ON p.id = ui.product_id
        LEFT JOIN records r
          ON r.user_id = ui.user_id
         AND r.product_id = ui.product_id
        WHERE ui.user_id = $1
          AND ui.remaining_quantity <= p.low_stock_threshold
        GROUP BY
          p.id,
          p.name,
          p.low_stock_threshold,
          ui.remaining_quantity,
          ui.assigned_at
        ORDER BY created_at DESC
        LIMIT 4
      `,
      [userId]
    );

    notifications.push(
      ...lowStockAssignments.map((product) =>
        serializeNotification({
          id: `assigned-low-stock-${product.id}`,
          type: "low_stock",
          severity: "high",
          title: `${product.name} is running low`,
          description: `${Number(product.remaining_quantity)} units remaining on your assignment.`,
          href: "/employee/products",
          created_at: product.created_at
        })
      ),
      ...announcements.map((announcement) =>
        serializeNotification({
          id: `announcement-${announcement.id}`,
          type: "announcement",
          severity: "normal",
          title: announcement.title,
          description: announcement.message,
          href: "/employee/communication",
          created_at: announcement.created_at
        })
      )
    );
  }

  notifications.sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );

  return NextResponse.json({
    notifications: notifications.slice(0, 10)
  });
}
