'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaGem } from 'react-icons/fa';
import { useAuth } from '@context/AuthContext';
import { catchShieldGem, getShieldsToday } from '@/lib/gemService';

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

type ShieldColor = 'blue' | 'green' | 'black';

const ARTWORK: Record<ShieldColor, string> = {
  blue: '/open_sourcery.png',
  green: '/open_sourcery_gem.png',
  black: '/open_sourcery_mono.png',
};

// Twinkles around a flying shield: none on the black one, a couple on the
// blue one, a full halo on the green one
const MINI_SPARKLES: Record<ShieldColor, { top: string; left: string; size: number; delay: string }[]> = {
  blue: [
    { top: '-8%', left: '78%', size: 9, delay: '0s' },
    { top: '68%', left: '-6%', size: 7, delay: '0.7s' },
  ],
  green: [
    { top: '-14%', left: '18%', size: 12, delay: '0s' },
    { top: '-6%', left: '76%', size: 10, delay: '0.35s' },
    { top: '34%', left: '-16%', size: 11, delay: '0.7s' },
    { top: '30%', left: '96%', size: 12, delay: '0.2s' },
    { top: '78%', left: '6%', size: 9, delay: '0.9s' },
    { top: '82%', left: '68%', size: 11, delay: '0.5s' },
  ],
  black: [],
};

const SPARKLE_COLOR: Record<ShieldColor, string> = {
  blue: 'from-white to-[#8fd0ff]',
  green: 'from-white to-[#7fe0b0]',
  black: '',
};

/**
 * The ribbon streaming off the back of a flying shield. It's part of the
 * shield's own box, so it banks and rolls with every swerve.
 */
const RIBBON: Record<ShieldColor, { length: number; thickness: number; tint: string }> = {
  blue: { length: 2.6, thickness: 0.42, tint: 'rgba(58, 158, 226, 0.7)' },
  green: { length: 3.6, thickness: 0.55, tint: 'rgba(47, 187, 143, 0.78)' },
  black: { length: 1.5, thickness: 0.28, tint: 'rgba(31, 32, 51, 0.5)' },
};

// Big enough to see and to hit comfortably while it's moving
/**
 * How each colour flies: blue darts across, green cruises, black drifts - and
 * the slower it goes, the deeper it swoops.
 */
const FLIGHT: Record<ShieldColor, { duration: number; depth: number }> = {
  // depth is a share of the window height, so a swoop is as deep as the
  // screen is tall: black sweeps almost top to bottom, blue stays shallow
  blue: { duration: 2000, depth: 0.14 },
  green: { duration: 3000, depth: 0.26 },
  black: { duration: 4000, depth: 0.42 },
};

// How long the burst stays after the shield has gone
const BURST_MS: Record<ShieldColor, number> = { blue: 460, green: 1050, black: 700 };
/** Shards thrown out by a black shield */
const SHARDS = [0, 45, 90, 135, 180, 225, 270, 315];

const MOTE_WHITE = 'bg-white shadow-[0_0_12px_3px_rgba(255,255,255,0.9)]';
const MOTE_GREEN =
  'bg-gradient-to-br from-white to-[#2fbb8f] shadow-[0_0_12px_3px_rgba(47,187,143,0.85)]';
const MOTE_BLACK = 'bg-graphite shadow-[0_0_12px_3px_rgba(31,32,51,0.45)]';

/*
 * Once the day's gems are caught, the crest's motes take on the colours the
 * shields were arriving in: a quarter black, and the rest split evenly
 * between white and green - so three white, three green, two black.
 */
const MOTE_COLOURS = [
  MOTE_GREEN,
  MOTE_WHITE,
  MOTE_BLACK,
  MOTE_GREEN,
  MOTE_WHITE,
  MOTE_GREEN,
  MOTE_WHITE,
  MOTE_BLACK,
];

const MINI_SIZE = 112;
/** Invisible margin around it that still counts as a hit */
const MINI_HIT_PADDING = 22;
/** The big crest sits out for this long after a black shield is popped */
const FREEZE_MS = 5000;
/** The day's allowance, mirroring the server's cap */
const SHIELD_GEMS_PER_DAY = 5;

interface Flight {
  id: number;
  color: ShieldColor;
  /** True when it flies left to right, so the ribbon trails on its left */
  leftToRight: boolean;
  /** Set once it's been clicked, freezing it where it was caught */
  caught?: { x: number; y: number };
}

const SOUNDS = ['/swoosh.mp3', '/pop.mp3', '/gem.mp3', '/explosion.mp3'];

/*
 * Sound through the Web Audio API rather than <audio> elements.
 *
 * An audio element still has to be handed to the browser's media pipeline
 * when it's asked to play, which can arrive late - heard as a swoosh trailing
 * the shield. Decoded once into memory, a clip starts on the same frame as
 * the press, and several can overlap.
 */
let audioContext: AudioContext | null = null;
const decodedSounds = new Map<string, AudioBuffer>();
/** Elements kept as a fallback where Web Audio isn't available */
const fallbackSounds = new Map<string, HTMLAudioElement>();

function preloadSounds() {
  if (audioContext || fallbackSounds.size > 0) return;

  const Context =
    typeof window !== 'undefined'
      ? window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;

  if (!Context) {
    for (const file of SOUNDS) {
      try {
        const audio = new Audio(file);
        audio.preload = 'auto';
        audio.volume = 0.55;
        fallbackSounds.set(file, audio);
      } catch {
        // No sound at all here; the egg works without it
      }
    }
    return;
  }

  audioContext = new Context();
  for (const file of SOUNDS) {
    fetch(file)
      .then((response) => response.arrayBuffer())
      .then((data) => audioContext!.decodeAudioData(data))
      .then((buffer) => decodedSounds.set(file, buffer))
      .catch((error) => console.error(`Couldn't load ${file}:`, error));
  }
}

function playSound(file: string) {
  const buffer = decodedSounds.get(file);

  if (audioContext && buffer) {
    // Starts suspended until a gesture; every play here follows a press
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});

    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();
    gain.gain.value = 0.55;
    source.buffer = buffer;
    source.connect(gain).connect(audioContext.destination);
    source.start();
    return;
  }

  try {
    const audio = fallbackSounds.get(file) ?? new Audio(file);
    audio.volume = 0.55;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {
    // No Audio support: silently carry on
  }
}

/** A flight across the screen, as keyframes for the Web Animations API */
function flightKeyframes(
  color: ShieldColor,
  leftToRight: boolean,
  reducedMotion: boolean
): { frames: Keyframe[]; duration: number } {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Starts off one edge and leaves by the other
  const from = leftToRight ? -MINI_SIZE * 1.5 : width + MINI_SIZE * 0.5;
  const to = leftToRight ? width + MINI_SIZE * 0.5 : -MINI_SIZE * 1.5;
  const flip = leftToRight ? 1 : -1;

  // Centred, so a deep swoop has as much room above as below
  const band = (height - MINI_SIZE) / 2 + (Math.random() - 0.5) * height * 0.06;

  // Each colour crosses at its own pace, give or take a little
  const duration = FLIGHT[color].duration * (0.9 + Math.random() * 0.2);

  // The slower it travels, the deeper it swoops - but never past an edge
  const headroom = Math.max(40, Math.min(band, height - MINI_SIZE - band) - 6);
  const depth = Math.min(height * FLIGHT[color].depth, headroom);

  const at = (t: number, y: number, rotate: number, scale = 1): Keyframe => ({
    offset: Math.min(1, Math.max(0, t)),
    transform: `translate3d(${from + (to - from) * t}px, ${y}px, 0) rotate(${rotate * flip}deg) scale(${scale})`,
  });

  if (reducedMotion) {
    return { frames: [at(0, band, 0), at(1, band, 0)], duration };
  }

  /**
   * Samples a height-over-time curve into frames, banking the shield along
   * the curve so it leans into each swoop rather than staying level.
   */
  const sample = (heightAt: (t: number) => number, steps = 28, scaleAt?: (t: number) => number) => {
    const frames: Keyframe[] = [];
    const span = to - from;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const step = 1 / steps;
      const dy = heightAt(Math.min(1, t + step)) - heightAt(Math.max(0, t - step));
      const dx = (span * (Math.min(1, t + step) - Math.max(0, t - step))) * flip;
      // Its nose follows the path, eased off so it never looks like a dart
      const bank = (Math.atan2(dy, Math.abs(dx)) * 180) / Math.PI;
      frames.push(at(t, heightAt(t), Math.max(-32, Math.min(32, bank * 0.8)) * flip, scaleAt?.(t)));
    }
    return frames;
  };

  const paths = [
    // One long, smooth swoop through the middle
    () => sample((t) => band + Math.sin(t * Math.PI * 1.5) * depth),
    // A rolling pair of swoops
    () => sample((t) => band + Math.sin(t * Math.PI * 2.5) * depth * 0.95),
    // A dive, then a climb out of it
    () => sample((t) => band + Math.sin(t * Math.PI) * depth - t * depth * 0.35),
    // Gentle undulation, breathing a little as it goes
    () =>
      sample(
        (t) => band + Math.sin(t * Math.PI * 3.5) * depth * 0.8,
        32,
        (t) => 0.94 + Math.sin(t * Math.PI * 3.5) * 0.06
      ),
    // A lazy loop mid-flight, still on a smooth line
    () => {
      const frames = sample((t) => band + Math.sin(t * Math.PI * 1.2) * depth * 0.9);
      return frames.map((frame, index) => {
        const t = index / (frames.length - 1);
        // A full roll through the middle third of the crossing
        const roll = t < 0.35 ? 0 : t > 0.65 ? 360 : ((t - 0.35) / 0.3) * 360;
        return {
          ...frame,
          transform: `${frame.transform} rotate(${roll * flip}deg)`,
        };
      });
    },
  ];

  return { frames: paths[Math.floor(Math.random() * paths.length)](), duration };
}

/** A caught shield: blue and green pop, black bursts */
function catchKeyframes(color: ShieldColor): { frames: Keyframe[]; duration: number } {
  if (color === 'black') {
    return {
      frames: [
        { offset: 0, transform: 'scale(1) rotate(0deg)', opacity: 1, filter: 'brightness(1)' },
        { offset: 0.25, transform: 'scale(1.6) rotate(-12deg)', opacity: 1, filter: 'brightness(2.4)' },
        { offset: 1, transform: 'scale(2.6) rotate(14deg)', opacity: 0, filter: 'brightness(1)' },
      ],
      duration: 520,
    };
  }

  return {
    frames: [
      { offset: 0, transform: 'scale(1)', opacity: 1 },
      { offset: 0.35, transform: 'scale(1.35)', opacity: 1 },
      { offset: 1, transform: 'scale(0.2)', opacity: 0 },
    ],
    duration: 380,
  };
}

// Glints around the gem popup
const POPUP_SPARKLES = [
  { top: '-24%', left: '6%', size: 11, delay: '0s' },
  { top: '-32%', left: '46%', size: 9, delay: '0.45s' },
  { top: '-18%', left: '88%', size: 12, delay: '0.2s' },
  { top: '70%', left: '-4%', size: 10, delay: '0.75s' },
  { top: '82%', left: '34%', size: 8, delay: '0.3s' },
  { top: '74%', left: '80%', size: 11, delay: '0.6s' },
];

/** Brief confirmation of a gem, at the top of the screen */
function GemPopup({ earnedToday, onDone }: { earnedToday: number; onDone: () => void }) {
  return (
    // Its whole life is one animation, ending in a fade; when that ends, it
    // goes. The centring sits outside it, clear of the animated transform.
    <div className="pointer-events-none fixed left-1/2 top-24 z-[60] -translate-x-1/2">
      <div
        className="animate-gem-popup relative"
        // Only this element's own animation ending means the popup is done;
        // the sparkles inside it animate too
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) onDone();
        }}
      >
        {POPUP_SPARKLES.map((sparkle, index) => (
          <span
            key={index}
            aria-hidden
            className="star animate-twinkle absolute bg-gradient-to-br from-white to-[#2fbb8f]"
            style={
              {
                top: sparkle.top,
                left: sparkle.left,
                width: sparkle.size,
                height: sparkle.size,
                '--delay': sparkle.delay,
              } as CSSProperties
            }
          />
        ))}

        <Link
          href="/gems"
          onClick={onDone}
          className="surface pointer-events-auto flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold text-graphite shadow-[0_10px_30px_-12px_rgba(47,187,143,0.5)]"
          // A green wash over the glass, rather than replacing its fill
          style={{
            backgroundImage:
              'linear-gradient(135deg, rgba(127, 224, 176, 0.42), rgba(127, 224, 176, 0.14))',
          }}
        >
          <FaGem className="text-[#2fbb8f]" aria-hidden />
          <span className="text-[#2fbb8f]">+1 Gem</span>
          <span className="font-normal text-graphite-soft">
            · {earnedToday}/{SHIELD_GEMS_PER_DAY} today
          </span>
        </Link>
      </div>
    </div>
  );
}

export default function HeroShield() {
  const { firebaseUser } = useAuth();

  const [flight, setFlight] = useState<Flight | null>(null);
  const [frozenUntil, setFrozenUntil] = useState(0);
  const [gemPopup, setGemPopup] = useState<{ id: number; earnedToday: number } | null>(null);
  // Shields caught today: sets the odds of the next green one, and turns the
  // crest's motes green once the day's five are in
  const [earnedToday, setEarnedToday] = useState(0);

  const miniRef = useRef<HTMLDivElement | null>(null);
  // The shield alone, so a pop fades it without taking the burst with it
  const shieldRef = useRef<HTMLDivElement | null>(null);
  // The flying shield is portalled to the body: the hero's own rise animation
  // is a transform, which would otherwise anchor a fixed child to the hero
  // rather than to the screen
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    preloadSounds();
  }, []);
  const animation = useRef<Animation | null>(null);
  const nextId = useRef(1);

  const frozen = frozenUntil > Date.now();
  // Their day's gems are all caught: the crest shows it in its motes
  const allGemsCaught = Boolean(firebaseUser) && earnedToday >= SHIELD_GEMS_PER_DAY;

  // Their count decides the green odds, so it's read once they're signed in
  useEffect(() => {
    if (!firebaseUser) {
      setEarnedToday(0);
      return;
    }
    getShieldsToday()
      .then(setEarnedToday)
      .catch((error) => console.error('Error loading caught shields:', error));
  }, [firebaseUser]);

  // Lift the freeze when its time is up
  useEffect(() => {
    if (!frozen) return;
    const timer = setTimeout(() => setFrozenUntil(0), frozenUntil - Date.now());
    return () => clearTimeout(timer);
  }, [frozen, frozenUntil]);

  const launch = () => {
    if (flight || frozen) return;

    /*
     * With nothing left to win or lose - signed out, or the day's five gems
     * already caught - every shield is blue. Otherwise a quarter are black;
     * of the rest, the day's first green comes at even odds and the
     * remaining four at one in four.
     */
    const nothingAtStake = !firebaseUser || earnedToday >= SHIELD_GEMS_PER_DAY;
    const greenChance = earnedToday === 0 ? 0.5 : 0.25;
    const color: ShieldColor = nothingAtStake
      ? 'blue'
      : Math.random() < 0.25
        ? 'black'
        : Math.random() < greenChance
          ? 'green'
          : 'blue';

    playSound('/swoosh.mp3');
    setFlight({ id: nextId.current++, color, leftToRight: Math.random() < 0.5 });
  };

  // Fly it across, and let it go if it makes it to the far edge
  useEffect(() => {
    const node = miniRef.current;
    if (!flight || flight.caught || !node) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const { frames, duration } = flightKeyframes(flight.color, flight.leftToRight, reduced);
    // Linear: it should hold the speed it entered with, not accelerate
    const flown = node.animate(frames, { duration, easing: 'linear', fill: 'forwards' });
    animation.current = flown;
    flown.onfinish = () => setFlight(null);

    // Animations stop advancing in a hidden tab, so a shield launched just
    // before switching away would hold the crest hostage. This clears it even
    // if the flight never reports finishing.
    const fallback = setTimeout(() => setFlight(null), duration + 2000);

    return () => {
      clearTimeout(fallback);
      flown.cancel();
    };
  }, [flight]);

  const claimGem = useCallback(async (popupId: number) => {
    try {
      const result = await catchShieldGem();
      setEarnedToday(result.earnedToday);

      setGemPopup((current) => {
        if (current?.id !== popupId) return current;
        // Nothing is said if the day's five turn out to be spent already
        return result.awarded ? { ...current, earnedToday: result.earnedToday } : null;
      });
    } catch (error) {
      console.error('Error claiming a gem:', error);
      setGemPopup((current) => (current?.id === popupId ? null : current));
    }
  }, []);

  // Pointer down, not click: it pops the moment you hit it, and there's no
  // window in which it could be dragged instead
  const catchShield = (event: React.PointerEvent) => {
    event.stopPropagation();
    if (!flight || flight.caught) return;

    // Freeze it where it was caught, then play the pop in place
    const node = miniRef.current;
    const rect = node?.getBoundingClientRect();
    animation.current?.cancel();

    const caught = { x: rect?.left ?? 0, y: rect?.top ?? 0 };
    const { color } = flight;
    setFlight({ ...flight, caught });

    if (color === 'black') {
      playSound('/explosion.mp3');
      setFrozenUntil(Date.now() + FREEZE_MS);
    } else if (color === 'green') {
      playSound('/gem.mp3');
      // Shown at once, on the count we expect: waiting for the server first
      // left a gap between the pop and the popup
      const popupId = nextId.current++;
      setGemPopup({
        id: popupId,
        earnedToday: Math.min(earnedToday + 1, SHIELD_GEMS_PER_DAY),
      });
      claimGem(popupId);
    } else {
      playSound('/pop.mp3');
    }
  };

  // The pop, once it's been caught
  useEffect(() => {
    const node = shieldRef.current;
    if (!flight?.caught || !node) return;

    const { frames, duration } = catchKeyframes(flight.color);
    const popped = node.animate(frames, { duration, easing: 'ease-out', fill: 'forwards' });

    // The shield goes first; the ring, the gem or the shards outlive it
    const clear = setTimeout(() => setFlight(null), BURST_MS[flight.color]);

    return () => {
      clearTimeout(clear);
      popped.cancel();
    };
  }, [flight]);

  return (
    <>
      <div className="relative mx-auto w-full select-none">
        {/* The glow sits behind the crest so it reads as lit from within */}
        <span
          className={`absolute inset-[12%] rounded-full bg-azure/25 blur-[70px] transition-opacity duration-500 ${frozen ? 'opacity-0' : ''}`}
        />
        <span
          className={`absolute inset-[26%] rounded-full bg-pastel-periwinkle/70 blur-[50px] transition-opacity duration-500 ${frozen ? 'opacity-0' : ''}`}
        />

        {/* Decorative, and so is the easter egg on it: kept out of the
            accessibility tree rather than announced as a control */}
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          // Launches on the press, and can't be dragged around
          onPointerDown={launch}
          onDragStart={(event) => event.preventDefault()}
          draggable={false}
          disabled={Boolean(flight) || frozen}
          className={`relative block w-full select-none transition-[filter,opacity] duration-500 ${
            frozen ? 'cursor-default opacity-50 grayscale' : flight ? 'cursor-default' : 'cursor-pointer'
          }`}
        >
          <Image
            src="/open_sourcery.png"
            alt=""
            width={520}
            height={520}
            draggable={false}
            priority
            className={`${frozen ? '' : 'animate-bob'} w-full drop-shadow-[0_24px_60px_rgba(31,32,51,0.22)]`}
          />
        </button>

        {/* Motes drift out of the base of the crest */}
        {!frozen && (
          <div className="pointer-events-none select-none absolute inset-x-0 bottom-6 h-48" aria-hidden>
            {SPARKLES.map((sparkle, index) => (
              <span
                key={index}
                className={`sparkle star absolute top-0 ${
                  allGemsCaught ? MOTE_COLOURS[index % MOTE_COLOURS.length] : MOTE_WHITE
                }`}
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
        )}
      </div>

      {mounted &&
        createPortal(
          <>
      {flight && (
        <div
          ref={miniRef}
          onPointerDown={catchShield}
          onDragStart={(event) => event.preventDefault()}
          draggable={false}
          aria-hidden
          className="fixed left-0 top-0 z-50 cursor-pointer select-none [touch-action:manipulation]"
          style={
            flight.caught
              ? { transform: `translate3d(${flight.caught.x}px, ${flight.caught.y}px, 0)` }
              : undefined
          }
        >
          <div className="relative" style={{ width: MINI_SIZE, height: MINI_SIZE }}>
            {/* A forgiving hit area: clicks just off the shield still catch it */}
            <span
              aria-hidden
              className="absolute"
              style={{ inset: -MINI_HIT_PADDING }}
            />

            {/* The burst, behind the shield and outliving it */}
            {flight.caught && flight.color !== 'black' && (
              <span
                aria-hidden
                className="animate-pop-ring absolute inset-0 rounded-full border-4"
                style={{ borderColor: flight.color === 'green' ? '#7fe0b0' : '#8fd0ff' }}
              />
            )}

            {flight.caught && flight.color === 'green' && (
              <span
                aria-hidden
                className="animate-plus-one absolute inset-x-0 top-0 text-center font-display text-3xl font-bold text-[#2fbb8f] drop-shadow-[0_2px_6px_rgba(255,255,255,0.9)]"
              >
                +1
              </span>
            )}

            {flight.caught && flight.color === 'black' && (
              <>
                <span
                  aria-hidden
                  className="animate-boom-flash absolute inset-[-20%] rounded-full"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(255,241,200,0.95) 0%, rgba(255,166,64,0.75) 40%, rgba(31,32,51,0) 70%)',
                  }}
                />
                {SHARDS.map((angle) => (
                  <span
                    key={angle}
                    aria-hidden
                    className="animate-boom-shard absolute left-1/2 top-1/2 h-2 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-graphite"
                    style={
                      {
                        '--angle': `${angle}deg`,
                        '--distance': `${MINI_SIZE * (0.7 + (angle % 90) / 240)}px`,
                      } as CSSProperties
                    }
                  />
                ))}
              </>
            )}

            {/* The shield itself, which the pop animation acts on */}
            <div ref={shieldRef} className="absolute inset-0">

            {/* The ribbon, streaming from whichever side it came from */}
            <span
              aria-hidden
              className="animate-ribbon absolute top-1/2 rounded-full blur-[6px]"
              style={{
                width: MINI_SIZE * RIBBON[flight.color].length,
                height: MINI_SIZE * RIBBON[flight.color].thickness,
                [flight.leftToRight ? 'right' : 'left']: MINI_SIZE * 0.45,
                background: `linear-gradient(to ${flight.leftToRight ? 'left' : 'right'}, ${
                  RIBBON[flight.color].tint
                } 0%, ${RIBBON[flight.color].tint} 12%, transparent 100%)`,
              }}
            />
            {flight.color === 'green' && (
              <span className="absolute inset-[-30%] rounded-full bg-[#7fe0b0]/40 blur-xl" />
            )}
            <Image
              src={ARTWORK[flight.color]}
              alt=""
              width={MINI_SIZE}
              height={MINI_SIZE}
              draggable={false}
              className="relative drop-shadow-[0_8px_20px_rgba(31,32,51,0.3)]"
            />
            {MINI_SPARKLES[flight.color].map((sparkle, index) => (
              <span
                key={index}
                className={`star animate-twinkle absolute bg-gradient-to-br ${SPARKLE_COLOR[flight.color]}`}
                style={
                  {
                    top: sparkle.top,
                    left: sparkle.left,
                    width: sparkle.size,
                    height: sparkle.size,
                    '--delay': sparkle.delay,
                  } as CSSProperties
                }
              />
            ))}
            </div>
          </div>
        </div>
      )}
      {gemPopup && (
        <GemPopup
          key={gemPopup.id}
          earnedToday={gemPopup.earnedToday}
          onDone={() => setGemPopup(null)}
        />
      )}
          </>,
          document.body
        )}
    </>
  );
}
