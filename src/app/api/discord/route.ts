import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/requestAuth";
import { errorResponse, HttpError } from "@/lib/server/httpErrors";
import { inviteToServerIfNeeded } from "@/lib/server/discordSync";
import { DISCORD_INVITE_URL, findMemberByUsername, isDiscordConfigured } from "@/lib/discordApi";

/**
 * Whether a username belongs to a member of the Open Sourcery server, and its
 * exact spelling there. Public, because sign-up checks it before there's an
 * account; it reveals only server membership, which any member can see.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("action") !== "validateUser") {
      throw new HttpError(400, "Unknown action");
    }

    const username = (searchParams.get("username") || "").slice(0, 100);
    if (!username.trim()) throw new HttpError(400, "username is required");

    // Without the bot nothing can be checked; the forms then accept the name
    if (!isDiscordConfigured()) {
      return NextResponse.json({ checked: false, inviteUrl: DISCORD_INVITE_URL });
    }

    const member = await findMemberByUsername(username);
    return NextResponse.json({
      checked: true,
      inServer: Boolean(member),
      username: member?.user.username ?? null,
      inviteUrl: DISCORD_INVITE_URL,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Discord actions for the caller's own account. Always acts on the profile
 * of whoever is signed in, never on a username from the request.
 */
export async function POST(request: NextRequest) {
  try {
    const uid = await requireUser(request);
    const body = await request.json().catch(() => ({}));

    switch (body?.action) {
      // Called at sign-up: invites them to the server if they're not in it
      case "inviteIfNeeded":
        return NextResponse.json(await inviteToServerIfNeeded(uid));

      default:
        throw new HttpError(400, "Unknown action");
    }
  } catch (error) {
    return errorResponse(error);
  }
}
