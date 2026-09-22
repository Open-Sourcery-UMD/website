import Link from 'next/link';
import { CSSProperties, ReactNode } from 'react';
import { PageContainer, SectionContainer } from '@components/Container';

const GUIDE_TONES = {
  orange: { light: '#ffc98a', deep: '#f4832b', ink: '#b35a12' },
  blue: { light: '#9fd8ff', deep: '#3da2ee', ink: '#0071bc' },
};

export interface GuideSectionLink {
  id: string;
  title: string;
}

/**
 * The frame every guide shares: title, intro, an "on this page" list, the
 * sections, and a pointer to the other guide.
 */
export function GuidePage({
  title,
  intro,
  sections,
  otherGuide,
  children,
}: {
  title: string;
  intro: ReactNode;
  sections: GuideSectionLink[];
  otherGuide: { title: string; href: string; blurb: string; tone: keyof typeof GUIDE_TONES };
  children: ReactNode;
}) {
  return (
    <PageContainer>
      <SectionContainer>
        <p className="eyebrow mb-3">Guides</p>
        <h1 className="mb-4 text-4xl font-semibold text-blue-600 md:text-6xl">{title}</h1>
        <p className="mb-8 text-lg text-black">{intro}</p>

        <nav aria-label="On this page" className="surface mb-10 rounded-2xl p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-graphite-mute">
            On this page
          </p>
          <ol className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-azure hover:underline">
                  {index + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-8">{children}</div>

        {/* A proper button to the other guide, in that guide's colour */}
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <p className="text-graphite-soft">{otherGuide.blurb}</p>
          <Link
            href={otherGuide.href}
            className="y2k-button group inline-flex items-center gap-2 px-8 py-3 font-semibold text-white"
            style={
              {
                '--btn': GUIDE_TONES[otherGuide.tone].light,
                '--btn-deep': GUIDE_TONES[otherGuide.tone].deep,
              } as CSSProperties
            }
          >
            Read the {otherGuide.title}
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </SectionContainer>
    </PageContainer>
  );
}

/** One numbered part of a guide, as a glass card */
export function GuideSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    // Anchored clear of the fixed navbar
    <section id={id} className="surface scroll-mt-28 rounded-3xl p-6 sm:p-8">
      <h2 className="mb-5 text-2xl font-semibold text-graphite md:text-3xl">{title}</h2>
      <div className="space-y-6 text-black">{children}</div>
    </section>
  );
}

/** A titled block within a section */
export function GuideTopic({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-lg font-semibold text-graphite">{title}</h3>
      <div className="space-y-3 leading-relaxed">{children}</div>
    </div>
  );
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-azure">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

/** Numbered steps with a bold lead-in */
export function Steps({ steps }: { steps: { title: ReactNode; body: ReactNode }[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#eef7ff] to-[#bcdcff] text-sm font-bold text-azure shadow-[inset_0_1px_0_#fff]">
            {index + 1}
          </span>
          <span className="pt-0.5">
            <strong className="font-semibold">{step.title}</strong> {step.body}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** A short aside, e.g. a tip or an optional step */
export function Callout({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-[#8fd0ff] bg-[#8fd0ff]/15 px-4 py-3 text-sm leading-relaxed">
      <strong className="font-semibold text-azure">{label}:</strong> {children}
    </p>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md bg-graphite/[0.06] px-1.5 py-0.5 font-mono text-[0.9em] text-graphite">
      {children}
    </code>
  );
}

/** A Discord channel name, styled the way Discord shows one */
export function Channel({ name }: { name: string }) {
  return (
    <span className="rounded-md bg-[#5865f2]/10 px-1.5 py-0.5 font-medium text-[#4752c4]">
      #{name}
    </span>
  );
}

export function EmailLink() {
  return (
    <a href="mailto:umdopensourcery@gmail.com" className="text-azure underline">
      umdopensourcery@gmail.com
    </a>
  );
}

export function SiteLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-azure underline">
      {children}
    </Link>
  );
}

const BOARD_COLUMNS = [
  { name: 'Backlog', note: "Hasn't been started" },
  { name: 'Ready', note: 'Ready to be picked up' },
  { name: 'In Progress', note: 'Actively being worked on' },
  { name: 'In Review', note: 'In review' },
  { name: 'Done', note: '' },
];

/** The project board's columns, left to right, as a small board */
export function BoardColumns() {
  return (
    <ol className="grid grid-cols-1 gap-2 sm:grid-cols-5">
      {BOARD_COLUMNS.map((column, index) => (
        <li
          key={column.name}
          className="relative rounded-2xl border border-[#8fd0ff]/70 bg-[#8fd0ff]/15 px-3 py-3 shadow-[inset_0_1px_0_#fff]"
        >
          <span className="block text-xs font-semibold uppercase tracking-wide text-azure">
            {index + 1}. {column.name}
          </span>
          {column.note && <span className="block text-sm text-graphite-soft">{column.note}</span>}
        </li>
      ))}
    </ol>
  );
}


/**
 * A link to a guide, styled as something to read rather than a call to
 * action: a glossy role badge, what's inside, and a "read" footer. The whole
 * card is the link.
 */
export function GuideCard({
  href,
  audience,
  title,
  blurb,
  sections,
  tone,
  icon,
}: {
  href: string;
  audience: string;
  title: string;
  blurb: string;
  sections: { id: string; title: string }[];
  tone: keyof typeof GUIDE_TONES;
  icon: ReactNode;
}) {
  const { light, deep, ink } = GUIDE_TONES[tone];

  return (
    <Link
      href={href}
      className="surface holo-rim card-glow group relative flex h-full flex-col overflow-hidden rounded-3xl p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-8"
      style={
        {
          '--glow': `${deep}73`,
          '--glow-edge': `${deep}59`,
          // The rim shimmers dark to light in the card's own colour
          '--rim': `linear-gradient(90deg, ${deep}, ${light}, ${deep})`,
        } as CSSProperties
      }
    >
      <div className="mb-5 flex items-center gap-4">
        {/* A flat tinted badge, like the icon chips on the home page cards */}
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full"
          style={{ backgroundColor: `${light}66`, color: deep }}
        >
          {icon}
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: ink }}>
          {audience}
        </span>
      </div>

      <h3 className="mb-2 text-2xl font-bold text-graphite">{title}</h3>
      <p className="mb-5 text-graphite-soft">{blurb}</p>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-graphite-mute">
        Inside this guide
      </p>
      <ul className="mb-6 flex flex-wrap gap-2">
        {sections.map((section) => (
          <li
            key={section.id}
            className="rounded-full border border-graphite/10 bg-white/70 px-3 py-1 text-sm text-graphite-soft"
          >
            {/* "Getting Started: Setting Up Your Project" reads as "Getting Started" */}
            {section.title.split(':')[0]}
          </li>
        ))}
      </ul>

      <span className="mt-auto flex items-center gap-2 font-semibold" style={{ color: ink }}>
        Read the guide
        <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
          →
        </span>
      </span>
    </Link>
  );
}
