import { NextResponse } from "next/server";

const CALENDAR_ID =
  "5b7a58404c2af1d793dbe615db518ec7deb99af922a4ef506a653a47c31341d6@group.calendar.google.com";

export async function GET() {
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing Google Calendar API key" },
      { status: 500 }
    );
  }

  const timeMin = new Date().toISOString();
  const timeMax = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from today

  const params = new URLSearchParams({
    key: apiKey,
    singleEvents: "true",
    orderBy: "startTime",
    timeMin,
    timeMax,
    maxResults: "50",
    timeZone: "America/New_York",
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    CALENDAR_ID
  )}/events?${params.toString()}`;

  const res = await fetch(url);

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Google Calendar API error:", errorText);

    return NextResponse.json(
      { error: "Google Calendar API request failed", details: errorText },
      { status: 400 }
    );
  }

  const data = await res.json();
  return NextResponse.json(data.items ?? []);
}
