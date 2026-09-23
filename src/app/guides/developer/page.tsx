import type { Metadata } from 'next';
import {
  BoardColumns,
  Bullets,
  Callout,
  Channel,
  Code,
  EmailLink,
  GuidePage,
  GuideSection,
  GuideTopic,
  SiteLink,
  Steps,
} from '@components/guides/GuideParts';
import { DEVELOPER_GUIDE_SECTIONS } from '@/lib/guides';

export const metadata: Metadata = {
  title: 'Developer Guide | Open Sourcery',
};

export default function DeveloperGuidePage() {
  return (
    <GuidePage
      title="Developer Guide"
      intro={
        <>
          As a Developer at Open Sourcery, you&apos;ll take part in a project team to build real software,
          contribute to open-source work, and grow your skills alongside other UMD students. This
          guide covers everything from joining your first project to how your team tracks and
          communicates work.
        </>
      }
      sections={DEVELOPER_GUIDE_SECTIONS}
      otherGuide={{
        title: 'Lead Developer Guide',
        href: '/guides/lead-developer',
        blurb: 'Thinking of starting your own project? See what leading a team involves.',
        tone: 'orange',
      }}
    >
      <GuideSection id="getting-started" title="Getting Started: Joining a Project">
        <Steps
          steps={[
            {
              title: "Register on this website.",
              body: "We'll send you an invite to the Open Sourcery GitHub organization.",
            },
            {
              title: 'Join a project.',
              body: (
                <>
                  Navigate to <SiteLink href="/our-projects">Join a Project</SiteLink>, choose one
                  you find interesting, and join it.
                </>
              ),
            },
          ]}
        />
        <GuideTopic title="Once you've been added to a project:">
          <Bullets
            items={[
              <>
                Run <Code>git clone &lt;repo_url&gt;.git</Code> in your terminal to clone the
                project onto your system.
              </>,
              "Your Lead Developer will set up a GitHub Project (your team's Kanban board and sprint tracker, and where you'll find your assigned issues).",
            ]}
          />
        </GuideTopic>
      </GuideSection>

      <GuideSection id="working" title="Working on Your Project">
        <GuideTopic title="Your GitHub Project Board">
          <p>Your team&apos;s board tracks work through columns like:</p>
          <BoardColumns />
        </GuideTopic>

        <GuideTopic title="Working on Assigned Issues">
          <Bullets
            items={[
              "Check your team's project board for your current issues",
              'Move issues through the columns as you work: Ready → In Progress → In Review → Done',
              "Give updates in your team's Discord channel as you go",
            ]}
          />
          <Callout label="Tip">
            Always check an issue&apos;s description before starting, context saves time!
          </Callout>
        </GuideTopic>

        <GuideTopic title="Marking Issues as Done">
          <Bullets
            items={[
              'Make commits to your repository to finish your issue',
              "Move the issue to Done once it's finished",
              "Tell your Lead Dev that you've finished it",
            ]}
          />
        </GuideTopic>
      </GuideSection>

      <GuideSection id="beyond" title="Beyond Your Team">
        <GuideTopic title='"Help Wanted" Issues'>
          <p>
            Want to contribute beyond your own project? Check Open Sourcery&apos;s org-wide issue
            tracker for &quot;help wanted&quot; issues opened up by other teams, and take one on if
            it interests you.
          </p>
        </GuideTopic>
        <GuideTopic title="Hack Sessions">
          <p>
            Hack sessions run regularly and give your team dedicated time to work on your
            project together, a great chance to unblock each other and ship features.
          </p>
        </GuideTopic>
      </GuideSection>

      <GuideSection id="connected" title="Staying Connected">
        <GuideTopic title="Collaborating & Communicating">
          <Bullets
            items={[
              "Message your project's Discord channel if you need help or feedback",
              'Keep discussions in issues, rather than side conversations, so everyone stays in the loop',
            ]}
          />
        </GuideTopic>
        <GuideTopic title="Points of Contact">
          <Bullets
            items={[
              <>
                Email: <EmailLink /> - reach out anytime with questions.
              </>,
              <>
                Discord:
                <ul className="mt-1.5 list-[circle] space-y-1.5 pl-5">
                  <li>
                    <Channel name="questions" /> - quick, general questions
                  </li>
                  <li>
                    <Channel name="all-devs" /> - discussion with developers across Open Sourcery
                  </li>
                  <li>Your project&apos;s own channel - for discussion with your team</li>
                </ul>
              </>,
            ]}
          />
        </GuideTopic>
      </GuideSection>
    </GuidePage>
  );
}
