import { NextResponse } from "next/server";

const MISSING_DATABASE_CONFIG_MESSAGE =
  "Database is not configured. Add DATABASE_URL to .env.local for local development, or set the Vercel Postgres variables, then restart the server.";

export function createErrorResponse(error, fallbackMessage) {
  const originalMessage =
    error instanceof Error && error.message ? error.message : fallbackMessage;
  const isMissingDatabaseConfig = originalMessage.includes(
    "A database connection string is not configured."
  );

  return NextResponse.json(
    {
      message: isMissingDatabaseConfig
        ? MISSING_DATABASE_CONFIG_MESSAGE
        : originalMessage
    },
    { status: isMissingDatabaseConfig ? 503 : 500 }
  );
}
