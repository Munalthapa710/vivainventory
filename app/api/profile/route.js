import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import db, { ensureDatabase, sanitizeUser } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

ensureDatabase();

function getCurrentUser(userId) {
  return db.prepare(`
    SELECT id, full_name, email, password_hash, role, is_active, created_at
    FROM users
    WHERE id = ?
  `).get(userId);
}

export async function GET() {
  const { session, response } = await requireSession();

  if (response) {
    return response;
  }

  const user = getCurrentUser(Number(session.user.id));

  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  return NextResponse.json({
    user: sanitizeUser(user)
  });
}

export async function PATCH(request) {
  const { session, response } = await requireSession();

  if (response) {
    return response;
  }

  try {
    const userId = Number(session.user.id);
    const user = getCurrentUser(userId);

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const body = await request.json();
    const fullNameProvided = typeof body.fullName === "string";
    const fullName = fullNameProvided ? body.fullName.trim() : null;
    const currentPassword = body.currentPassword?.trim() || "";
    const newPassword = body.newPassword?.trim() || "";
    const updates = [];
    const values = [];

    if (fullNameProvided) {
      if (!fullName) {
        return NextResponse.json(
          { message: "Full name cannot be empty." },
          { status: 400 }
        );
      }

      updates.push("full_name = ?");
      values.push(fullName);
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { message: "New password must be at least 6 characters long." },
          { status: 400 }
        );
      }

      if (!currentPassword) {
        return NextResponse.json(
          { message: "Current password is required to set a new password." },
          { status: 400 }
        );
      }

      const passwordMatches = await bcrypt.compare(
        currentPassword,
        user.password_hash
      );

      if (!passwordMatches) {
        return NextResponse.json(
          { message: "Current password is incorrect." },
          { status: 400 }
        );
      }

      updates.push("password_hash = ?");
      values.push(await bcrypt.hash(newPassword, 10));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { message: "No profile changes were submitted." },
        { status: 400 }
      );
    }

    values.push(userId);

    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(
      ...values
    );

    const updatedUser = getCurrentUser(userId);

    return NextResponse.json({
      message: newPassword
        ? "Settings updated successfully."
        : "Profile updated successfully.",
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to update settings." },
      { status: 500 }
    );
  }
}
