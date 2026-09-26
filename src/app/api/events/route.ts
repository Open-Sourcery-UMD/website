import { NextResponse } from "next/server";
import { UPCOMING_EVENTS } from "@/lib/eventService";

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

  // Whatever comes next, however far off: the count is the limit rather than
  // the horizon. Ordered by start time, and timeMin filters on when an event
  // ends, so one happening right now still comes back - first, since it
  // started earliest.
  const params = new URLSearchParams({
    key: apiKey,
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: new Date().toISOString(),
    maxResults: String(UPCOMING_EVENTS),
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
