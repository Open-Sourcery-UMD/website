import type { Metadata } from 'next';
import { CSSProperties, ReactNode } from 'react';
import { PageContainer, SectionContainer } from '@components/Container';
import { GuideCard } from '@components/guides/GuideParts';
import { DEVELOPER_GUIDE_SECTIONS, LEAD_DEVELOPER_GUIDE_SECTIONS } from '@/lib/guides';

export const metadata: Metadata = {
  title: 'About | Open Sourcery',
};

/** A list marked with the club's own ⪼ bullets */
function ChevronList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span aria-hidden className="font-semibold text-azure">
            ⪼
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function AboutSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="surface rounded-3xl p-6 sm:p-8">
      <h2 className="mb-4 text-2xl font-semibold text-graphite md:text-3xl">{title}</h2>
      <div className="space-y-4 leading-relaxed text-black">{children}</div>
    </section>
  );
}

const CodeIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const TeamIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
);

export default function AboutPage() {
  return (
    <PageContainer>
      <SectionContainer>
        <p className="eyebrow mb-3">About</p>
        <h1 className="mb-4 text-4xl font-semibold text-blue-600 md:text-6xl">About Open Sourcery</h1>
        <p className="mb-8 text-lg text-black">
          Open Sourcery is the University of Maryland&apos;s premier student organization dedicated
          to collaborative and open-source software development. We bring together driven
          students, from seasoned engineers to those just beginning their technical journey, to
          build real-world software, contribute to meaningful open-source initiatives, and develop
          industry-ready skills through structured and hands-on experience.
        </p>

        {/* The mission, set apart as the page's headline statement */}
        <div
          className="surface holo-rim relative mb-10 overflow-hidden rounded-3xl p-6 sm:p-8"
          // Dark to light blue, the home page title's colours
          style={{ '--rim': 'linear-gradient(90deg, #439edb, #98f0ff, #439edb)' } as CSSProperties}
        >
          <p className="eyebrow mb-3">Our mission</p>
          <p className="text-lg leading-relaxed text-graphite md:text-xl">
            Our mission is clear: to elevate technical excellence at UMD by providing members with
            direct exposure to real-world development workflows, long-term project collaboration,
            and mentorship within a strong, growth-oriented community. We&apos;re a launchpad for
            students who want to become impactful software engineers.
          </p>
        </div>

        <div className="space-y-8">
          <AboutSection title="What We Do">
            <p>
              Open Sourcery operates through GitHub-based open-source projects that range from
              short-term builds (under one semester) to long-term development initiatives lasting up
              to a full academic year. Members are matched to project teams based on interest and
              experience level to maximize meaningful contributions and measurable growth.
            </p>
            <p className="font-semibold text-graphite">We emphasize:</p>
            <ChevronList
              items={[
                'Structured project matching and team formation',
                'Dedicated mentorship from experienced student developers',
                'Real-world development practices (version control, issue tracking, documentation)',
                'Long-term portfolio-building opportunities',
              ]}
            />
          </AboutSection>

          <AboutSection title="Our Programming">
            <p>
              Our cornerstone events are recurring Hack Sessions, where teams gather to collaborate,
              ship features, and move projects forward in a focused and supportive environment.
              These sessions simulate professional development workflows and provide consistent
              accountability and momentum.
            </p>
            <p className="font-semibold text-graphite">In addition, we host:</p>
            <ChevronList
              items={[
                'General Body Meetings (GBMs)',
                'Project showcases highlighting cool builds',
                'Technical workshops (e.g., Intro to Git/GitHub, Intro to Open Source)',
                'Networking and community-building social events',
              ]}
            />
          </AboutSection>

          <AboutSection title="Why Join?">
            <p>
              Open Sourcery provides meaningful experience, networking, and credibility. Members
              acquire:
            </p>
            <ChevronList
              items={[
                'Demonstrable project experiences and open-source/GitHub contributions',
                'Experience working in structured engineering teams',
                'Exposure to open-source collaboration standards',
                'A strong technical network within UMD',
              ]}
            />
            <p>
              If you&apos;re serious about improving as a developer, contributing to impactful
              software, and joining a motivated technical community, Open Sourcery is where you
              belong. 🩵
            </p>
          </AboutSection>
        </div>

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-semibold text-graphite md:text-3xl">
            Build real software. Work with real teams.
          </h2>
          <p className="mt-2 text-lg text-graphite-soft md:text-xl">We hope to see you with us!</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          <GuideCard
            href="/guides/lead-developer"
            audience="For Lead Developers"
            title="Lead Developer Guide"
            blurb="Everything you need to set up, run, and grow a project as its Lead Developer."
            sections={LEAD_DEVELOPER_GUIDE_SECTIONS}
            tone="orange"
            icon={CodeIcon}
          />
          <GuideCard
            href="/guides/developer"
            audience="For Developers"
            title="Developer Guide"
            blurb="Everything from joining your first project to how your team tracks and communicates work."
            sections={DEVELOPER_GUIDE_SECTIONS}
            tone="blue"
            icon={TeamIcon}
          />
        </div>
      </SectionContainer>
    </PageContainer>
  );
}
