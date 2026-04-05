import { NextResponse } from "next/server";
import { createErrorResponse } from "@/lib/api";
import { query, queryOne, queryRows } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import {
  GROUP_CONVERSATION_ID,
  getDirectConversationId,
  isUserOnline,
  serializeTimestamp
} from "@/lib/communication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function touchPresence(userId, client) {
  await query(
    `
      INSERT INTO user_presence (user_id, last_seen_at)
      VALUES ($1, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at
    `,
    [userId],
    client
  );
}

async function markConversationRead(
  userId,
  conversationKey,
  conversationType,
  otherUserId = null,
  client
) {
  await query(
    `
      INSERT INTO conversation_reads (
        user_id,
        conversation_key,
        conversation_type,
        other_user_id,
        last_read_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id, conversation_key)
      DO UPDATE SET
        conversation_type = EXCLUDED.conversation_type,
        other_user_id = EXCLUDED.other_user_id,
        last_read_at = GREATEST(
          conversation_reads.last_read_at,
          EXCLUDED.last_read_at
        )
    `,
    [userId, conversationKey, conversationType, otherUserId],
    client
  );
}

function serializeMessage(message, currentUserId) {
  return {
    id: Number(message.id),
    sender_id: Number(message.sender_id),
    recipient_user_id: message.recipient_user_id
      ? Number(message.recipient_user_id)
      : null,
    conversation_type: message.conversation_type,
    body: message.body,
    created_at: serializeTimestamp(message.created_at),
    sender_name: message.sender_name,
    sender_role: message.sender_role,
    is_mine: Number(message.sender_id) === currentUserId
  };
}

export async function GET(request) {
  try {
    const { session, response } = await requireSession();

    if (response) {
      return response;
    }

    const currentUserId = Number(session.user.id);
    await touchPresence(currentUserId);

    const { searchParams } = new URL(request.url);
    const conversationType =
      searchParams.get("conversationType") === "direct" ? "direct" : "group";

    if (conversationType === "group") {
      const messages = await queryRows(
        `
          SELECT *
          FROM (
            SELECT
              m.id,
              m.sender_id,
              m.recipient_user_id,
              m.conversation_type,
              m.body,
              m.created_at,
              u.full_name AS sender_name,
              u.role AS sender_role
            FROM chat_messages m
            INNER JOIN users u ON u.id = m.sender_id
            WHERE m.conversation_type = 'group'
            ORDER BY m.created_at DESC
            LIMIT 120
          ) recent
          ORDER BY created_at ASC
        `
      );

      await markConversationRead(
        currentUserId,
        GROUP_CONVERSATION_ID,
        "group"
      );

      return NextResponse.json({
        conversation: {
          conversation_id: GROUP_CONVERSATION_ID,
          type: "group",
          label: "Team Chat"
        },
        messages: messages.map((message) =>
          serializeMessage(message, currentUserId)
        )
      });
    }

    const otherUserId = Number(searchParams.get("userId"));

    if (!Number.isInteger(otherUserId) || otherUserId <= 0) {
      return NextResponse.json(
        { message: "Choose a valid conversation." },
        { status: 400 }
      );
    }

    if (otherUserId === currentUserId) {
      return NextResponse.json(
        { message: "Direct conversation cannot target yourself." },
        { status: 400 }
      );
    }

    const otherUser = await queryOne(
      `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.role,
          up.last_seen_at
        FROM users u
        LEFT JOIN user_presence up ON up.user_id = u.id
        WHERE u.id = $1
          AND u.is_active = TRUE
      `,
      [otherUserId]
    );

    if (!otherUser) {
      return NextResponse.json(
        { message: "Conversation user not found." },
        { status: 404 }
      );
    }

    const messages = await queryRows(
      `
        SELECT *
        FROM (
          SELECT
            m.id,
            m.sender_id,
            m.recipient_user_id,
            m.conversation_type,
            m.body,
            m.created_at,
            u.full_name AS sender_name,
            u.role AS sender_role
          FROM chat_messages m
          INNER JOIN users u ON u.id = m.sender_id
          WHERE m.conversation_type = 'direct'
            AND (
              (m.sender_id = $1 AND m.recipient_user_id = $2) OR
              (m.sender_id = $2 AND m.recipient_user_id = $1)
            )
          ORDER BY m.created_at DESC
          LIMIT 120
        ) recent
        ORDER BY created_at ASC
      `,
      [currentUserId, otherUserId]
    );

    await markConversationRead(
      currentUserId,
      getDirectConversationId(otherUserId),
      "direct",
      otherUserId
    );

    return NextResponse.json({
      conversation: {
        conversation_id: getDirectConversationId(otherUserId),
        type: "direct",
        user_id: Number(otherUser.id),
        label: otherUser.full_name,
        email: otherUser.email,
        role: otherUser.role,
        is_online: isUserOnline(otherUser.last_seen_at),
        last_seen_at: serializeTimestamp(otherUser.last_seen_at)
      },
      messages: messages.map((message) =>
        serializeMessage(message, currentUserId)
      )
    });
  } catch (error) {
    return createErrorResponse(error, "Unable to load messages.");
  }
}
