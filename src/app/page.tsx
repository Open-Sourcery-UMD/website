'use client';

import { useState, useEffect } from 'react';

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
        <span className="eyebrow animate-rise">Open source at Maryland</span>

        <h1 className="mt-7 text-graphite text-[2.75rem] leading-[1.02] sm:text-7xl lg:text-8xl font-semibold animate-rise animation-delay-200">
          <span className="block text-black text-2xl sm:text-4xl lg:text-5xl font-normal tracking-tight mb-3">
            We are
          </span>
          {/*
            The typed text is laid over a full-width copy of the final string,
            so the headline occupies its finished size from the first frame and
            the crest beside it never gets pushed while typing.
          */}
          <span className="relative inline-block whitespace-normal sm:whitespace-nowrap">
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
          <p className="text-lg sm:text-xl leading-relaxed text-graphite-soft">
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
          {/* Sits at the far edge of its column, clear of the headline */}
          <div className="hidden lg:block justify-self-end lg:translate-x-6 xl:translate-x-10 animate-rise animation-delay-400">
            <HeroShield />
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
