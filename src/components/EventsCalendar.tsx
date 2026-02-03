"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GoArrowUpRight } from "react-icons/go";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    date?: string;
    dateTime?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
  };
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function EventsCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const calendarLink = "https://calendar.google.com/calendar/u/2?cid=NWI3YTU4NDA0YzJhZjFkNzkzZGJlNjE1ZGI1MThlYzdkZWI5OWFmOTIyYTRlZjUwNmE2NTNhNDdjMzEzNDFkNkBncm91cC5jYWxlbmRhci5nb29nbGUuY29t";

  const gradientColors = 'from-ycs-pink/20 to-transparent';
  const hoverGradient = 'hover:from-ycs-pink/30';
  const borderColor = 'border-ycs-pink';

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/events");
        const data = await res.json();
        setEvents(data);
      } catch (err) {
        console.error("Failed to load events", err);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-gray-500">
        Loading events…
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        No upcoming events.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6">
        Upcoming Events
      </h2>

      <div className="space-y-4">
        {events.map((event) => {
          const start = event.start.dateTime || event.start.date!;
          const end = event.end.dateTime || event.end.date!;

          return (
            <div
              key={event.id}
              className={`flex gap-4 rounded-2xl bg-gradient-to-br ${gradientColors} ${hoverGradient} border-l-8 ${borderColor} bg-white p-4 transition-all duration-300 hover:shadow-lg hover:translate-y-[-4px]`}
            >
              {/* Date column */}
              <div className="w-20 text-center border-r pr-4">
                <div className="text-sm text-gray-800">
                  {new Date(start).toLocaleString('default', { month: 'short' })}
                </div>
                <div className="text-xl text-gray-800">
                  {new Date(start).getDate()}
                </div>
              </div>

              {/* Event details */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">
                  {event.summary}
                </h3>

                <p className="text-sm text-gray-800 mt-1">
                  {event.start.dateTime ? (
                    <>
                      {formatTime(start)} – {formatTime(end)}
                    </>
                  ) : (
                    "All day"
                  )}
                </p>

                {event.location && (
                  <p className="text-sm text-gray-800 mt-1">
                    📍 {event.location}
                  </p>
                )}

                {event.description && (
                  <p className="text-sm text-gray-800 mt-2 line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end mt-2">
        <Link
          href={calendarLink}
          aria-label="Add to Calendar"
          className="flex items-center text-ycs-pink hover:text-white hover:underline transition-colors duration-300 mt-2 cursor-pointer text-sm"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>Add to Calendar</span>
          <GoArrowUpRight size={20} className="ml-3" />
        </Link>
      </div>
    </div>
  );
}
