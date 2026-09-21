import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/requestAuth";
import { errorResponse, HttpError } from "@/lib/server/httpErrors";
import { computeGemBreakdown, getLeaderboard } from "@/lib/server/gems";

// A cold leaderboard rebuild scores every member against GitHub, which can
// outlast the default serverless time limit
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    switch (searchParams.get("action")) {
      case "mine": {
        const uid = await requireUser(request);
        return NextResponse.json(await computeGemBreakdown(uid));
      }

      // Members only: it lists other students by name and GitHub
      case "leaderboard":
        await requireUser(request);
        return NextResponse.json(await getLeaderboard());

      default:
        throw new HttpError(400, "Unknown action");
    }
  } catch (error) {
    return errorResponse(error);
  }
}
