import { NextResponse } from "next/server";
import db, { ensureDatabase, serializeAnnouncement } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

ensureDatabase();

export async function GET(request) {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const limitValue = Number(searchParams.get("limit"));
  const limit =
    Number.isInteger(limitValue) && limitValue > 0 ? `LIMIT ${limitValue}` : "";

  const announcements = db
    .prepare(`
      SELECT
        a.id,
        a.title,
        a.message,
        a.created_by,
        a.created_at,
        u.full_name AS created_by_name
      FROM announcements a
      LEFT JOIN users u ON u.id = a.created_by
      ORDER BY a.created_at DESC
      ${limit}
    `)
    .all()
    .map(serializeAnnouncement);

  return NextResponse.json({ announcements });
}

export async function POST(request) {
  const { session, response } = await requireSession("admin");

  if (response) {
    return response;
  }

  try {
    const body = await request.json();
    const title = body.title?.trim();
    const message = body.message?.trim();

    if (!title || !message) {
      return NextResponse.json(
        { message: "Title and message are required." },
        { status: 400 }
      );
    }

    const result = db
      .prepare(`
        INSERT INTO announcements (
          title,
          message,
          created_by,
          created_at
        )
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `)
      .run(title, message, Number(session.user.id));

    const announcement = db
      .prepare(`
        SELECT
          a.id,
          a.title,
          a.message,
          a.created_by,
          a.created_at,
          u.full_name AS created_by_name
        FROM announcements a
        LEFT JOIN users u ON u.id = a.created_by
        WHERE a.id = ?
      `)
      .get(result.lastInsertRowid);

    return NextResponse.json(
      {
        message: "Announcement posted successfully.",
        announcement: serializeAnnouncement(announcement)
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to create announcement." },
      { status: 500 }
    );
  }
}
