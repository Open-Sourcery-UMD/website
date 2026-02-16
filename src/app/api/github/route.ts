import { NextResponse } from "next/server";
import { getRepositoryTeamMembers } from "@lib/githubService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo");
  if (!repo) return NextResponse.json({ error: "Missing repo" }, { status: 400 });

  const response = await getRepositoryTeamMembers("Open-Sourcery-UMD", repo);
  return NextResponse.json(response);
}
