"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { CalendarEvent } from "@/types/events";

type EventContextType = {
  events: CalendarEvent[];
  currentEvent: CalendarEvent | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const EventContext = createContext<EventContextType | null>(null);

function determineCurrentEvent(events: CalendarEvent[]): CalendarEvent | null {
  if (!events.length) return null;

  const now = new Date();

  // Find event currently happening (now is between start and end)
  return (
    events.find((event) => {
      const start = new Date(event.start.dateTime || event.start.date!);
      const end = new Date(event.end.dateTime || event.end.date!);
      return now >= start && now <= end;
    }) || null
  );
}

export function EventProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/events");

      if (!res.ok) {
        throw new Error("Failed to fetch events");
      }

      const data: CalendarEvent[] = await res.json();
      setEvents(data);
      setCurrentEvent(determineCurrentEvent(data));
    } catch (err) {
      console.error("Failed to load events:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const refetch = async () => {
    await fetchEvents();
  };

  return (
    <EventContext.Provider
      value={{ events, currentEvent, loading, error, refetch }}
    >
      {children}
    </EventContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEvents must be used within EventProvider");
  }
  return context;
}
