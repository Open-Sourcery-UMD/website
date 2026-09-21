import { NextRequest, NextResponse } from "next/server";
import { requireRecentSignIn } from "@/lib/server/requestAuth";
import { errorResponse, HttpError } from "@/lib/server/httpErrors";
import { deleteAccount } from "@/lib/server/memberActions";

/**
 * Changes to the caller's own account. Deleting it can't be undone, so it
 * needs a password confirmed moments ago, not just a valid session.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    switch (body?.action) {
      case "delete": {
        const uid = await requireRecentSignIn(request);
        await deleteAccount(uid);
        return NextResponse.json({ success: true });
      }

      default:
        throw new HttpError(400, "Unknown action");
    }
  } catch (error) {
    return errorResponse(error);
  }
}
