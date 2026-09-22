import Link from 'next/link';
import { CSSProperties, FC } from 'react';
import { HiInformationCircle } from 'react-icons/hi';

type Tone = 'orange' | 'pink' | 'blue' | 'green' | 'red';

interface Props {
  title: string;
  text: string;
  color: Tone;
  link?: string;
  label?: string;
  icon?: React.ReactNode;
  /** A page explaining more, reached from an info icon in the top right */
  info?: { link: string; label: string };
}

// Brighter, candy-coloured tones, each with a deeper base for the gloss
const TONES: Record<Tone, { accent: string; deep: string }> = {
  orange: { accent: '#ffb057', deep: '#f4832b' },
  pink: { accent: '#ff9ed2', deep: '#ee5fae' },
  blue: { accent: '#8fd0ff', deep: '#3da2ee' },
  green: { accent: '#9df0d8', deep: '#3fc3a3' },
  red: { accent: '#ffa3a3', deep: '#f05f5f' },
};

export const GradientBox: FC<Props> = ({ title, text, color, link, label, icon, info }) => {
  const { accent, deep } = TONES[color] ?? TONES.blue;

  // Alpha suffixes on the hex: 33 = 20%, 52 = 32%, 59 = 35%
  const tone = {
    '--accent': deep,
    '--wash': `${accent}52`,
    '--wash-hover': `${accent}80`,
    '--chip': `${accent}59`,
    '--btn': accent,
    '--btn-deep': deep,
  } as CSSProperties;

  return (
    <div
      className="cta-card relative h-full w-full rounded-3xl p-8 text-left hover:-translate-y-1"
      style={tone}
    >
      {info && (
        <Link
          href={info.link}
          title={info.label}
          aria-label={info.label}
          className="absolute right-5 top-5 rounded-full transition-transform duration-200 hover:scale-110"
          style={{ color: deep }}
        >
          <HiInformationCircle size={34} aria-hidden className="drop-shadow-[0_2px_4px_rgba(31,32,51,0.18)]" />
        </Link>
      )}

      <div className="flex h-full flex-col">
        {/* Kept clear of the info icon */}
        <div className={`mb-4 flex items-center ${info ? 'pr-10' : ''}`}>
          {icon && <div className="cta-chip mr-4 rounded-full p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" style={{ color: deep }}>{icon}</div>}
          <h3 className="text-2xl font-bold text-graphite">{title}</h3>
        </div>

        <p className="mb-6 flex-grow text-base leading-relaxed text-graphite-soft lg:text-lg">
          {text}
        </p>

        {link && label && (
          <Link
            href={link}
            className="y2k-button flex cursor-pointer justify-center self-center px-9 py-3 text-center font-semibold text-white"
          >
            {label}
          </Link>
        )}
      </div>
    </div>
  );
};
