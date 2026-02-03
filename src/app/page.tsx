'use client';

import { useState, useEffect } from 'react';

import { PageContainer, SectionContainer } from '@components/Container';
import ExploreLink from '@components/ExploreLink';
import Link from 'next/link';
import { TitleSubtitle } from '@components/TitleSubtitle';
import { GradientBox } from '@components/GradientBox';
import EventsCalendar from '@components/EventsCalendar';
import Image from 'next/image';

const Home = () => {
  const openSourceryProjectsLink = 'https://github.com/open-sourcery-umd';
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
      <div className="hidden md:flex justify-start items-start fixed top-0 left-0 w-full h-full -z-10">
        <div
          className="opacity-[0.03]"
          style={{
            position: 'absolute',
            top: '0%',
            left: '17%',
          }}
        >
          <Image src="/open_sourcery_mono.png" alt="Open Sourcery Logo" width={1000} height={1000} />
        </div>
      </div>

      <SectionContainer>
        <p className="text-white font-semibold text-3xl md:text-5xl mb-4 bg-gradient-to-r from-ycs-pink to-ycs-pink text-transparent bg-clip-text">
          We are
        </p>
        <h1 className="text-white text-4xl sm:text-6xl md:text-8xl font-semibold">
          <span className="whitespace-normal sm:whitespace-nowrap">
            {displayText}
            <span
              className={`${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}
            >
              |
            </span>
          </span>
        </h1>

        <div className="mt-16 text-xl">
          <p className="text-white max-w-3xl">
            Open Sourcery is a group of developers at the <Link href={umdLink} target='_blank' className='text-ycs-pink'>University of Maryland, College Park</Link> who build open-source software applications and connect over our shared love for creating.
          </p>
          <ExploreLink href={openSourceryProjectsLink} />
        </div>
      </SectionContainer>

      <SectionContainer>
        <EventsCalendar />
      </SectionContainer>

      <SectionContainer>
        <TitleSubtitle
          title="Join Us"
          subtitle="Take part in UMD's open-source community"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
          <GradientBox
            title="Start a new project"
            color="pink"
            text="Have a cool idea? Fill out our project proposal form to become a Lead Developer of an open-source project team and connect with likeminded contributors."
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
            text="Enter our team matching portal to join our community of Developers and help build awesome open-source software on a project team."
            link="/team-matching-portal/form"
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
    </PageContainer>
  );
};

export default Home;
