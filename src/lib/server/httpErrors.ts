import { NextResponse } from "next/server";

/**
 * An error whose message is safe to show the user, with the status to send.
 */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Turns a thrown error into a response. Only HttpError messages reach the
 * client; anything else is logged and reported generically, so internal
 * details (GitHub responses, stack traces) aren't leaked.
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("Unexpected API error:", error);
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 }
  );
}
