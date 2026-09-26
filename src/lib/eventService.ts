import { CalendarEvent } from "@/types/events";

/**
 * How many events the site looks ahead to.
 */
export const UPCOMING_EVENTS = 4;

/**
 * Determines if an event is currently ongoing
 * Handles both all-day and timed events
 * @param event - The calendar event to check
 * @returns true if the event is currently happening, false otherwise
 */
export function isEventOngoing(event: CalendarEvent): boolean {
  const now = new Date();
  const start = new Date(event.start.dateTime || event.start.date!);
  const end = new Date(event.end.dateTime || event.end.date!);

  return now >= start && now <= end;
}
