import { NextResponse } from "next/server";
import { queryOne, queryRows, serializeAnnouncement } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const limitValue = Number(searchParams.get("limit"));
  const hasLimit = Number.isInteger(limitValue) && limitValue > 0;
  const queryText = `
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
    ${hasLimit ? "LIMIT $1" : ""}
  `;

  const announcements = (
    await queryRows(queryText, hasLimit ? [limitValue] : [])
  ).map(serializeAnnouncement);

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

    const announcement = await queryOne(
      `
        INSERT INTO announcements (
          title,
          message,
          created_by,
          created_at
        )
        VALUES ($1, $2, $3, NOW())
        RETURNING id, title, message, created_by, created_at
      `,
      [title, message, Number(session.user.id)]
    );

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
