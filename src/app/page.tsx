'use client';

import { useState, useEffect, useRef } from 'react';
import { CREST_MAX_WIDTH, placeCrest } from '@/lib/heroCrest';

import { PageContainer, SectionContainer } from '@components/Container';
import ExploreLink from '@components/ExploreLink';
import Link from 'next/link';
import { TitleSubtitle } from '@components/TitleSubtitle';
import { GradientBox } from '@components/GradientBox';
import EventsCalendar from '@components/EventsCalendar';
import HeroShield from '@components/HeroShield';
import ProjectDashboard from '@components/project/ProjectDashboard';
import Image from 'next/image';
import { useAuth } from '@context/AuthContext';

const Home = () => {
  const { firestoreUser } = useAuth();
  const ourProjectsLink = '/our-projects';
  const umdLink = 'https://umd.edu/';

  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const fullText = 'Open Sourcery';
  const typingSpeed = 100;
  const cursorBlinkSpeed = 530;
  const [showCursor, setShowCursor] = useState(true);

  /*
   * The crest sits midway between the end of the wordmark and the right edge
   * of the screen - and shrinks to fit when that gap is narrower than it is,
   * which happens on smaller desktops. See placeCrest for the reasoning.
   */
  const wordmarkRef = useRef<HTMLSpanElement | null>(null);
  const crestRef = useRef<HTMLDivElement | null>(null);
  const [crestShift, setCrestShift] = useState(0);
  const [crestWidth, setCrestWidth] = useState(CREST_MAX_WIDTH);

  useEffect(() => {
    const place = () => {
      const wordmark = wordmarkRef.current;
      const crest = crestRef.current;
      if (!wordmark || !crest) return;

      const { width, centre } = placeCrest(
        wordmark.getBoundingClientRect().right,
        window.innerWidth
      );

      /*
       * The nudge already applied is read from the DOM, not from React state:
       * state can be a step ahead of what's painted, and subtracting a shift
       * that isn't on screen yet would land the crest somewhere wrong - over
       * the headline, in the worst case.
       */
      const applied = new DOMMatrixReadOnly(getComputedStyle(crest).transform).m41;
      const crestBox = crest.getBoundingClientRect();
      const restingCentre = crestBox.left + crestBox.width / 2 - applied;

      setCrestWidth((current) => (Math.abs(width - current) < 1 ? current : width));
      const next = centre - restingCentre;
      setCrestShift((shift) => (Math.abs(next - shift) < 1 ? shift : next));
    };

    /*
     * Placed straight away, then again after the next paint to catch layout
     * that was still settling. Measuring twice is harmless because the shift
     * already applied is read back from the DOM each time - and the immediate
     * call matters in a background tab, where frames don't run at all.
     */
    const schedule = () => {
      place();
      requestAnimationFrame(place);
    };

    schedule();
    // The wordmark's width settles after the web font loads and changes with
    // the window; the crest's own width changes as it is fitted to the gap
    const observer = new ResizeObserver(schedule);
    if (wordmarkRef.current) observer.observe(wordmarkRef.current);
    if (crestRef.current) observer.observe(crestRef.current);
    document.fonts?.ready.then(schedule).catch(() => {});
    window.addEventListener('resize', schedule);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, []);

  useEffect(() => {
    if (isTyping && displayText.length < fullText.length) {
      const timeout = setTimeout(() => {
        setDisplayText(fullText.slice(0, displayText.length + 1));
      }, typingSpeed);

      return () => clearTimeout(timeout);
    } else if (isTyping && displayText.length === fullText.length) {
      setIsTyping(false);
    }
  }, [displayText, isTyping]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, cursorBlinkSpeed);

    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <PageContainer>
      {/*
        The mono crest, part of the fixed backdrop rather than the hero, so it
        holds its place as the page scrolls past. The artwork is light, so it's
        inverted for the pale canvas, and it bleeds off the left edge to keep
        clear of the centred content.
      */}
      <div className="pointer-events-none fixed -left-[12%] top-1/2 -z-10 hidden -translate-y-1/2 opacity-[0.05] invert md:block">
        <Image
          src="/open_sourcery_mono.png"
          alt=""
          aria-hidden
          width={780}
          height={780}
          priority
        />
      </div>

      <SectionContainer className="relative pt-0 sm:pt-2 lg:pt-6">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          {/* min-w-0 keeps the headline from widening its column */}
          <div className="min-w-0">
        <span className="eyebrow animate-rise select-none">Open source at Maryland</span>

        {/* Not selectable: dragging across it while catching shields shouldn't
            start a text selection */}
        <h1 className="mt-7 select-none text-graphite text-[2.75rem] leading-[1.02] sm:text-7xl lg:text-8xl font-semibold animate-rise animation-delay-200">
          <span className="block text-black text-2xl sm:text-4xl lg:text-5xl font-normal tracking-tight mb-3">
            We are
          </span>
          {/*
            The typed text is laid over a full-width copy of the final string,
            so the headline occupies its finished size from the first frame and
            the crest beside it never gets pushed while typing.
          */}
          <span
            ref={wordmarkRef}
            className="relative inline-block whitespace-normal sm:whitespace-nowrap"
          >
            <span aria-hidden className="invisible">
              {fullText}
            </span>
            <span className="absolute inset-0">
              <span className="text-spell-gradient">{displayText}</span>
              <span
                aria-hidden
                className={`${showCursor ? 'opacity-100' : 'opacity-0'} text-azure font-light transition-opacity duration-100`}
              >
                |
              </span>
            </span>
          </span>
        </h1>

        <div className="mt-10 max-w-2xl animate-rise animation-delay-400">
          <p className="text-lg sm:text-xl leading-relaxed text-black select-none">
            Open Sourcery is a group of developers at the{' '}
            <Link
              href={umdLink}
              target="_blank"
              className="text-graphite border-b border-graphite/25 hover:border-azure hover:text-azure transition-colors duration-300"
            >
              University of Maryland, College Park
            </Link>{' '}
            who build open-source software applications and connect over our shared
            love for creating.
          </p>
          <ExploreLink href={ourProjectsLink} />
        </div>
          </div>

          {/* The crest, floating beside the wordmark */}
          {/* Centred in the space between the headline and the right edge */}
          {/*
            Two elements on purpose: the nudge is a transform, which must not
            resize the column, and it lives outside the rise animation - a CSS
            animation on the same element would override an inline transform.
          */}
          <div
            ref={crestRef}
            style={{ width: crestWidth, transform: `translateX(${crestShift}px)` }}
            className="hidden min-w-0 lg:block justify-self-center"
          >
            <div className="animate-rise animation-delay-400">
              <HeroShield />
            </div>
          </div>
        </div>

        {/* Closes the hero and separates it from the calendar below */}
        <div className="rule-gradient mt-16" />
      </SectionContainer>

      <SectionContainer>
        <EventsCalendar />
      </SectionContainer>

      <SectionContainer>
        <TitleSubtitle
          eyebrow="Get involved"
          title="Join Us"
          subtitle="Take part in UMD's open-source community"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-14">
          <GradientBox
            title="Start a new project"
            color="orange"
            text="Have a cool idea? Submit a project proposal to become a Lead Developer of an open-source project team and connect with likeminded contributors."
            link="/project-proposal-form"
            label="Start a Project"
            info={{ link: '/guides/lead-developer', label: 'Read the Lead Developer Guide' }}
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            }
          />
          <GradientBox
            title="Join an ongoing project"
            color="blue"
            text="Browse our projects to join our community of Developers and help build awesome open-source software on a project team."
            link="/our-projects"
            label="Join a Project"
            info={{ link: '/guides/developer', label: 'Read the Developer Guide' }}
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            }
          />
        </div>
      </SectionContainer>

      {firestoreUser && <ProjectDashboard />}
    </PageContainer>
  );
};

export default Home;
