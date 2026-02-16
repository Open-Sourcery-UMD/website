export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    date?: string;        // All-day events (YYYY-MM-DD)
    dateTime?: string;    // Timed events (ISO 8601)
  };
  end: {
    date?: string;        // All-day events (YYYY-MM-DD)
    dateTime?: string;    // Timed events (ISO 8601)
  };
}
