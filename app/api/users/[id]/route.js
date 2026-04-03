import { NextResponse } from "next/server";
import db, { ensureDatabase, sanitizeUser } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

ensureDatabase();

function getUserById(id) {
  return db.prepare(`
    SELECT id, full_name, email, role, is_active, created_at
    FROM users
    WHERE id = ?
  `).get(id);
}

export async function GET(_request, { params }) {
  const { response } = await requireSession("admin");

  if (response) {
    return response;
  }

  const userId = Number(params.id);
  const user = getUserById(userId);

  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const summary = db
    .prepare(`
      SELECT
        COUNT(*) AS assigned_products,
        COALESCE(SUM(remaining_quantity), 0) AS remaining_units
      FROM user_inventory
      WHERE user_id = ?
    `)
    .get(userId);

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
    const currentUser = getUserById(userId);

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

      updates.push("full_name = ?");
      values.push(fullName);
    }

    if (typeof body.email === "string") {
      const email = body.email.trim().toLowerCase();

      if (!email) {
        return NextResponse.json(
          { message: "Email cannot be empty." },
          { status: 400 }
        );
      }

      const existing = db
        .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
        .get(email, userId);

      if (existing) {
        return NextResponse.json(
          { message: "Another user already uses this email." },
          { status: 409 }
        );
      }

      updates.push("email = ?");
      values.push(email);
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
        const activeAdminCount = db
          .prepare(
            "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1"
          )
          .get();

        if (Number(activeAdminCount.count || 0) <= 1) {
          return NextResponse.json(
            { message: "At least one active admin account is required." },
            { status: 400 }
          );
        }
      }

      updates.push("role = ?");
      values.push(role);
    }

    if (typeof body.is_active === "boolean") {
      if (Number(session.user.id) === userId && body.is_active === false) {
        return NextResponse.json(
          { message: "You cannot deactivate your own account." },
          { status: 400 }
        );
      }

      if (currentUser.role === "admin" && body.is_active === false) {
        const activeAdminCount = db
          .prepare(
            "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1"
          )
          .get();

        if (Number(activeAdminCount.count || 0) <= 1) {
          return NextResponse.json(
            { message: "At least one active admin account is required." },
            { status: 400 }
          );
        }
      }

      updates.push("is_active = ?");
      values.push(body.is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { message: "No valid fields provided for update." },
        { status: 400 }
      );
    }

    values.push(userId);

    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(
      ...values
    );

    const updatedUser = getUserById(userId);

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
    const user = getUserById(userId);

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
      const adminCount = db
        .prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'")
        .get();

      if (Number(adminCount.count || 0) <= 1) {
        return NextResponse.json(
          { message: "You cannot delete the last admin account." },
          { status: 400 }
        );
      }
    }

    const removeUser = db.transaction(() => {
      const assignments = db
        .prepare(`
          SELECT product_id, remaining_quantity
          FROM user_inventory
          WHERE user_id = ?
        `)
        .all(userId);

      for (const assignment of assignments) {
        db.prepare(`
          UPDATE products
          SET total_quantity = total_quantity + ?
          WHERE id = ?
        `).run(Number(assignment.remaining_quantity), Number(assignment.product_id));
      }

      db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    });

    removeUser();

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
