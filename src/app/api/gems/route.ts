import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/requestAuth";
import { errorResponse, HttpError } from "@/lib/server/httpErrors";
import {
  awardShieldGem,
  computeGemBreakdown,
  getLeaderboard,
  getShieldGemsToday,
} from "@/lib/server/gems";

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

      // How many shields they've caught today, for the home page easter egg
      case "shieldsToday": {
        const uid = await requireUser(request);
        return NextResponse.json({ earnedToday: await getShieldGemsToday(uid) });
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

/**
 * Catching a green shield on the home page. The five-a-day cap is enforced
 * on the server, so a page that asked for more would simply be refused.
 */
export async function POST(request: NextRequest) {
  try {
    const uid = await requireUser(request);
    const body = await request.json().catch(() => ({}));

    if (body?.action !== "shieldGem") throw new HttpError(400, "Unknown action");

    return NextResponse.json(await awardShieldGem(uid));
  } catch (error) {
    return errorResponse(error);
  }
}
