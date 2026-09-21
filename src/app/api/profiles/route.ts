import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/requestAuth";
import { errorResponse, HttpError } from "@/lib/server/httpErrors";
import { getProjectLeads, getProjectTeam } from "@/lib/server/profiles";

/**
 * Other members' contact details, served from the server because Firestore
 * profiles are owner-only. Project leads are public, shown on Our Projects to
 * everyone; a full team roster is for that team's own members.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    switch (searchParams.get("action")) {
      case "leads":
        return NextResponse.json(await getProjectLeads());

      case "team": {
        const uid = await requireUser(request);
        return NextResponse.json(await getProjectTeam(uid, searchParams.get("projectId")));
      }

      default:
        throw new HttpError(400, "Unknown action");
    }
  } catch (error) {
    return errorResponse(error);
  }
}
