import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import db, { ensureDatabase, sanitizeUser } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

ensureDatabase();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");

  if (view === "communication") {
    const { response } = await requireSession();

    if (response) {
      return response;
    }

    const employees = db
      .prepare(`
        SELECT id, full_name, email, role, is_active, created_at
        FROM users
        WHERE role = 'employee' AND is_active = 1
        ORDER BY full_name COLLATE NOCASE ASC
      `)
      .all()
      .map(sanitizeUser);

    const inventoryRows = db.prepare(`
      SELECT
        ui.user_id,
        ui.product_id,
        ui.remaining_quantity,
        ui.assigned_quantity,
        p.name,
        p.category,
        p.unit
      FROM user_inventory ui
      INNER JOIN users u ON u.id = ui.user_id
      INNER JOIN products p ON p.id = ui.product_id
      WHERE u.role = 'employee' AND u.is_active = 1
      ORDER BY u.full_name COLLATE NOCASE ASC, p.name COLLATE NOCASE ASC
    `).all();

    const employeesWithInventory = employees.map((employee) => ({
      ...employee,
      products: inventoryRows
        .filter((row) => Number(row.user_id) === employee.id)
        .map((row) => ({
          product_id: Number(row.product_id),
          name: row.name,
          category: row.category,
          unit: row.unit,
          assigned_quantity: Number(row.assigned_quantity),
          remaining_quantity: Number(row.remaining_quantity)
        }))
    }));

    return NextResponse.json({
      employees: employeesWithInventory
    });
  }

  const { response } = await requireSession("admin");

  if (response) {
    return response;
  }

  if (view === "dashboard") {
    const summary = db
      .prepare(`
        SELECT
          COUNT(*) AS total_users,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_users,
          SUM(CASE WHEN role = 'employee' THEN 1 ELSE 0 END) AS total_employees,
          SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS total_admins
        FROM users
      `)
      .get();

    return NextResponse.json({
      totalUsers: Number(summary.total_users || 0),
      activeUsers: Number(summary.active_users || 0),
      totalEmployees: Number(summary.total_employees || 0),
      totalAdmins: Number(summary.total_admins || 0)
    });
  }

  const users = db
    .prepare(`
      SELECT id, full_name, email, role, is_active, created_at
      FROM users
      ORDER BY created_at DESC
    `)
    .all()
    .map(sanitizeUser);

  return NextResponse.json({ users });
}

export async function POST(request) {
  const { response } = await requireSession("admin");

  if (response) {
    return response;
  }

  try {
    const body = await request.json();
    const fullName = body.fullName?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    const role = body.role === "admin" ? "admin" : "employee";

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { message: "Full name, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const existing = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);

    if (existing) {
      return NextResponse.json(
        { message: "A user with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = db
      .prepare(`
        INSERT INTO users (
          full_name,
          email,
          password_hash,
          role,
          is_active,
          created_at
        )
        VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      `)
      .run(fullName, email, passwordHash, role);

    const createdUser = db
      .prepare(`
        SELECT id, full_name, email, role, is_active, created_at
        FROM users
        WHERE id = ?
      `)
      .get(result.lastInsertRowid);

    return NextResponse.json(
      {
        message: "User created successfully.",
        user: sanitizeUser(createdUser)
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to create user." },
      { status: 500 }
    );
  }
}
