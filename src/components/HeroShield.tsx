'use client';

import Image from 'next/image';
import { CSSProperties } from 'react';

/**
 * Motes falling from the crest.
 *
 * The values are fixed rather than random so the server and client render the
 * same markup, and staggered so the group never pulses in lockstep.
 */
const SPARKLES = [
  { left: '22%', size: 14, delay: '0s', duration: '3.6s', drift: '-18px', fall: '150px' },
  { left: '34%', size: 10, delay: '1.1s', duration: '4.4s', drift: '12px', fall: '180px' },
  { left: '44%', size: 13, delay: '0.5s', duration: '3.1s', drift: '-6px', fall: '130px' },
  { left: '52%', size: 9, delay: '2.2s', duration: '4.9s', drift: '20px', fall: '190px' },
  { left: '61%', size: 12, delay: '1.6s', duration: '3.8s', drift: '-14px', fall: '160px' },
  { left: '70%', size: 10, delay: '0.8s', duration: '4.2s', drift: '8px', fall: '175px' },
  { left: '78%', size: 11, delay: '2.7s', duration: '3.4s', drift: '-10px', fall: '140px' },
  { left: '29%', size: 8, delay: '3.1s', duration: '4.6s', drift: '16px', fall: '185px' },
];

export default function HeroShield() {
  return (
    <div className="relative ml-auto mr-0 w-[min(24rem,70vw)] select-none" aria-hidden>
      {/* The glow sits behind the crest so it reads as lit from within */}
      <span className="absolute inset-[12%] rounded-full bg-azure/25 blur-[70px]" />
      <span className="absolute inset-[26%] rounded-full bg-pastel-periwinkle/70 blur-[50px]" />

      <Image
        src="/open_sourcery.png"
        alt=""
        width={520}
        height={520}
        priority
        className="animate-bob relative w-full drop-shadow-[0_24px_60px_rgba(31,32,51,0.22)]"
      />

      {/* Motes drift out of the base of the crest */}
      <div className="pointer-events-none select-none absolute inset-x-0 bottom-6 h-48">
        {SPARKLES.map((sparkle, index) => (
          <span
            key={index}
            className="sparkle star absolute top-0 bg-white shadow-[0_0_12px_3px_rgba(255,255,255,0.9)]"
            style={
              {
                left: sparkle.left,
                width: `${sparkle.size}px`,
                height: `${sparkle.size}px`,
                '--delay': sparkle.delay,
                '--duration': sparkle.duration,
                '--drift': sparkle.drift,
                '--fall': sparkle.fall,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
