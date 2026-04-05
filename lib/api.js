import { NextResponse } from "next/server";

export function createErrorResponse(error, fallbackMessage) {
  const message =
    error instanceof Error && error.message ? error.message : fallbackMessage;

  return NextResponse.json({ message }, { status: 500 });
}
