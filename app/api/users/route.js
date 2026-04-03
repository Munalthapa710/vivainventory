import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { queryOne, queryRows, sanitizeUser } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");

  if (view === "communication") {
    const { response } = await requireSession();

    if (response) {
      return response;
    }

    const employees = (
      await queryRows(`
        SELECT id, full_name, email, role, is_active, created_at
        FROM users
        WHERE role = 'employee' AND is_active = TRUE
        ORDER BY LOWER(full_name) ASC
      `)
    ).map(sanitizeUser);

    const inventoryRows = await queryRows(`
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
      WHERE u.role = 'employee' AND u.is_active = TRUE
      ORDER BY LOWER(u.full_name) ASC, LOWER(p.name) ASC
    `);

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
    const summary = await queryOne(`
      SELECT
        COUNT(*) AS total_users,
        SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) AS active_users,
        SUM(CASE WHEN role = 'employee' THEN 1 ELSE 0 END) AS total_employees,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS total_admins
      FROM users
    `);

    return NextResponse.json({
      totalUsers: Number(summary.total_users || 0),
      activeUsers: Number(summary.active_users || 0),
      totalEmployees: Number(summary.total_employees || 0),
      totalAdmins: Number(summary.total_admins || 0)
    });
  }

  const users = (
    await queryRows(`
      SELECT id, full_name, email, role, is_active, created_at
      FROM users
      ORDER BY created_at DESC
    `)
  ).map(sanitizeUser);

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

    const existing = await queryOne(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing) {
      return NextResponse.json(
        { message: "A user with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const createdUser = await queryOne(
      `
        INSERT INTO users (
          full_name,
          email,
          password_hash,
          role,
          is_active,
          created_at
        )
        VALUES ($1, $2, $3, $4, TRUE, NOW())
        RETURNING id, full_name, email, role, is_active, created_at
      `,
      [fullName, email, passwordHash, role]
    );

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
