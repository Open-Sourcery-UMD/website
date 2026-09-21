import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/requestAuth";
import { errorResponse, HttpError } from "@/lib/server/httpErrors";
import {
  joinProject,
  leaveProject,
  removeMember,
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
    const { action, projectId, username } = body ?? {};

    switch (action) {
      case "join":
        await joinProject(uid, projectId);
        break;

      case "leave":
        await leaveProject(uid, projectId);
        break;

      case "removeMember":
        await removeMember(uid, projectId, username);
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
