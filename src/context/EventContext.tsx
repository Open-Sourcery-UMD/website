"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { CalendarEvent } from "@/types/events";
import { isEventOngoing } from "@/lib/eventService";

type EventContextType = {
  events: CalendarEvent[];
  currentEvent: CalendarEvent | null;
  loading: boolean;
  error: string | null;
};

const EventContext = createContext<EventContextType | null>(null);

export function EventProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/events");

        if (!res.ok) {
          throw new Error("Failed to fetch events");
        }

        const data: CalendarEvent[] = await res.json();
        setEvents(data);
        setCurrentEvent(data.find(isEventOngoing) ?? null);
      } catch (err) {
        console.error("Failed to load events:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <EventContext.Provider value={{ events, currentEvent, loading, error }}>
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
