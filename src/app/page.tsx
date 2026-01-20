'use client';

import { useState, useEffect } from 'react';

import { PageContainer, SectionContainer } from '@components/Container';
import ExploreLink from '@components/ExploreLink';
import Link from 'next/link';

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
    </PageContainer>
  );
};

export default Home;
