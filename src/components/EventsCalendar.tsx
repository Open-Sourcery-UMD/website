"use client";

import Link from "next/link";
import { GoArrowUpRight } from "react-icons/go";
import { useEvents } from "@/context/EventContext";
import { useState } from "react";
import { motion } from 'framer-motion';
import Image from "next/image";
import { CalendarEvent } from "@/types/events";
import { isEventOngoing } from "@/lib/eventService";

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

const EventCard = ({ event, isOngoing }: { event: CalendarEvent; isOngoing: boolean }) => {
  const [isHovered, setIsHovered] = useState(false);

  const start = event.start.dateTime || event.start.date!;
  const end = event.end.dateTime || event.end.date!;

  const isAllDay = !!event.start.date && !event.start.dateTime;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTimeRange = () => {
    if (isAllDay) return "All Day";

    return `${formatTime(start)} – ${formatTime(end)}`;
  };

  // -------- Tag + Image Logic (case-insensitive) --------
  const lowerSummary = event.summary.toLowerCase();

  let tag = "MISC";
  let imageSrc = "/open_sourcery.png";

  // Main events
  if (lowerSummary.includes("hack session")) {
    tag = "HACK SESSION";
    imageSrc = "/open_sourcery_mono.png";
  } else if (
    lowerSummary.includes("gbm") ||
    lowerSummary.includes("general body meeting")
  ) {
    tag = "GBM";
  } else if (lowerSummary.includes("workshop")) {
    tag = "WORKSHOP";
  }

  // Specialized events
  if (lowerSummary.includes("gdsc")) {
    imageSrc = "/event-images/gdsc.png";
  } else if (lowerSummary.includes("infoscifi")) {
    imageSrc = "/event-images/infoscifi.png";
  } else if (lowerSummary.includes("bitcamp")) {
    imageSrc = "/event-images/bitcamp.png";
  } else if (lowerSummary.includes("jeopardy")) {
    imageSrc = "/event-images/jeopardy.png";
  }

  return (
    <motion.div
      className={`bg-zinc-800/50 rounded-lg overflow-hidden group cursor-pointer relative ${
        isOngoing ? 'animate-sparkle' : ''
      }`}
      whileHover={{ y: -5 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <div className="relative h-56 overflow-hidden">
        <Image
          src={imageSrc}
          alt={event.summary}
          width={600}
          height={400}
          className={`object-cover w-full h-full transition-transform duration-500 ${
            isHovered ? "scale-110" : "scale-100"
          }`}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 flex items-end">
          <div className="p-5 w-full">
            {/* Tag */}
            <div className="mb-2">
              <span className="text-xs bg-ycs-pink/90 text-white px-3 py-1 rounded-full font-medium tracking-wide">
                {tag}
              </span>
            </div>

            {/* Summary */}
            <h3 className="text-white text-xl font-bold">
              {event.summary}
            </h3>

            {/* Date + Time */}
            <p className="text-zinc-300 text-sm mt-1">
              {formatDate(start)} • {formatTimeRange()}
            </p>

            {/* Location */}
            {event.location && (
              <p className="text-zinc-300 text-sm mt-1">
                📍 {event.location}
              </p>
            )}

            {/* Description */}
            {event.description && (
              <p className="text-zinc-400 text-sm mt-3 line-clamp-2">
                {event.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ONGOING Bar */}
      {isOngoing && (
        <div className="absolute bottom-0 left-0 right-0 bg-sparkle-gold/90 py-2 text-center">
          <span className="text-sm font-bold text-zinc-900 tracking-widest">
            ONGOING
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default function EventsCalendar() {
  const { events, loading, error } = useEvents();

  const calendarLink = "https://calendar.google.com/calendar/u/2?cid=NWI3YTU4NDA0YzJhZjFkNzkzZGJlNjE1ZGI1MThlYzdkZWI5OWFmOTIyYTRlZjUwNmE2NTNhNDdjMzEzNDFkNkBncm91cC5jYWxlbmRhci5nb29nbGUuY29t";

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-gray-500">
        Loading events…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        Failed to load events. Please try again later.
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

      <div className="grid md:grid-cols-2 gap-6">
        {events.slice(0, 4).map((event) => (
          <EventCard key={event.id} event={event} isOngoing={isEventOngoing(event)} />
        ))}
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
