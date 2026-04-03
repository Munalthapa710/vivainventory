import { NextResponse } from "next/server";
import {
  query,
  queryOne,
  queryRows,
  sanitizeUser,
  withTransaction
} from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getUserById(id, client) {
  return queryOne(
    `
      SELECT id, full_name, email, role, is_active, created_at
      FROM users
      WHERE id = $1
    `,
    [id],
    client
  );
}

export async function GET(_request, { params }) {
  const { response } = await requireSession("admin");

  if (response) {
    return response;
  }

  const userId = Number(params.id);
  const user = await getUserById(userId);

  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const summary = await queryOne(
    `
      SELECT
        COUNT(*) AS assigned_products,
        COALESCE(SUM(remaining_quantity), 0) AS remaining_units
      FROM user_inventory
      WHERE user_id = $1
    `,
    [userId]
  );

  return NextResponse.json({
    user: sanitizeUser(user),
    summary: {
      assignedProducts: Number(summary.assigned_products || 0),
      remainingUnits: Number(summary.remaining_units || 0)
    }
  });
}

export async function PATCH(request, { params }) {
  const { session, response } = await requireSession("admin");

  if (response) {
    return response;
  }

  try {
    const userId = Number(params.id);
    const currentUser = await getUserById(userId);

    if (!currentUser) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const body = await request.json();
    const updates = [];
    const values = [];

    if (typeof body.full_name === "string") {
      const fullName = body.full_name.trim();

      if (!fullName) {
        return NextResponse.json(
          { message: "Full name cannot be empty." },
          { status: 400 }
        );
      }

      values.push(fullName);
      updates.push(`full_name = $${values.length}`);
    }

    if (typeof body.email === "string") {
      const email = body.email.trim().toLowerCase();

      if (!email) {
        return NextResponse.json(
          { message: "Email cannot be empty." },
          { status: 400 }
        );
      }

      const existing = await queryOne(
        "SELECT id FROM users WHERE email = $1 AND id != $2",
        [email, userId]
      );

      if (existing) {
        return NextResponse.json(
          { message: "Another user already uses this email." },
          { status: 409 }
        );
      }

      values.push(email);
      updates.push(`email = $${values.length}`);
    }

    if (typeof body.role === "string") {
      const role = body.role === "admin" ? "admin" : "employee";

      if (
        currentUser.role === "admin" &&
        role !== "admin" &&
        Number(session.user.id) === userId
      ) {
        return NextResponse.json(
          { message: "You cannot change your own admin role here." },
          { status: 400 }
        );
      }

      if (currentUser.role === "admin" && role !== "admin") {
        const activeAdminCount = await queryOne(
          `
            SELECT COUNT(*) AS count
            FROM users
            WHERE role = 'admin' AND is_active = TRUE
          `
        );

        if (Number(activeAdminCount.count || 0) <= 1) {
          return NextResponse.json(
            { message: "At least one active admin account is required." },
            { status: 400 }
          );
        }
      }

      values.push(role);
      updates.push(`role = $${values.length}`);
    }

    if (typeof body.is_active === "boolean") {
      if (Number(session.user.id) === userId && body.is_active === false) {
        return NextResponse.json(
          { message: "You cannot deactivate your own account." },
          { status: 400 }
        );
      }

      if (currentUser.role === "admin" && body.is_active === false) {
        const activeAdminCount = await queryOne(
          `
            SELECT COUNT(*) AS count
            FROM users
            WHERE role = 'admin' AND is_active = TRUE
          `
        );

        if (Number(activeAdminCount.count || 0) <= 1) {
          return NextResponse.json(
            { message: "At least one active admin account is required." },
            { status: 400 }
          );
        }
      }

      values.push(body.is_active);
      updates.push(`is_active = $${values.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { message: "No valid fields provided for update." },
        { status: 400 }
      );
    }

    values.push(userId);

    await query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${values.length}`,
      values
    );

    const updatedUser = await getUserById(userId);

    return NextResponse.json({
      message: "User updated successfully.",
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to update user." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request, { params }) {
  const { session, response } = await requireSession("admin");

  if (response) {
    return response;
  }

  try {
    const userId = Number(params.id);
    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    if (Number(session.user.id) === userId) {
      return NextResponse.json(
        { message: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    if (user.role === "admin") {
      const adminCount = await queryOne(
        "SELECT COUNT(*) AS count FROM users WHERE role = 'admin'"
      );

      if (Number(adminCount.count || 0) <= 1) {
        return NextResponse.json(
          { message: "You cannot delete the last admin account." },
          { status: 400 }
        );
      }
    }

    await withTransaction(async (client) => {
      const assignments = await queryRows(
        `
          SELECT product_id, remaining_quantity
          FROM user_inventory
          WHERE user_id = $1
        `,
        [userId],
        client
      );

      for (const assignment of assignments) {
        await client.query(
          `
            UPDATE products
            SET total_quantity = total_quantity + $1
            WHERE id = $2
          `,
          [Number(assignment.remaining_quantity), Number(assignment.product_id)]
        );
      }

      await client.query("DELETE FROM users WHERE id = $1", [userId]);
    });

    return NextResponse.json({
      message: "User deleted successfully."
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to delete user." },
      { status: 500 }
    );
  }
}
