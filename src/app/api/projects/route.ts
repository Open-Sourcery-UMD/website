import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/requestAuth";
import { errorResponse, HttpError } from "@/lib/server/httpErrors";
import {
  joinProject,
  leaveProject,
  withdrawProposal,
} from "@/lib/server/memberActions";

/**
 * Membership changes. Every action requires a signed-in caller and acts on
 * their own account; the rules are enforced in memberActions.
 */
export async function POST(request: NextRequest) {
  try {
    const uid = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const { action, projectId } = body ?? {};

    switch (action) {
      // Also reports how the Discord side went, so the page can say so
      case "join":
        return NextResponse.json({ success: true, discord: await joinProject(uid, projectId) });

      case "leave":
        await leaveProject(uid, projectId);
        break;

      case "withdrawProposal":
        await withdrawProposal(uid, projectId);
        break;

      default:
        throw new HttpError(400, "Unknown action");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
