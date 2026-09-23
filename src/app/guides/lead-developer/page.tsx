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
import { LEAD_DEVELOPER_GUIDE_SECTIONS } from '@/lib/guides';

export const metadata: Metadata = {
  title: 'Lead Developer Guide | Open Sourcery',
};

/** Who reports to whom, with the reader's own place highlighted */
function OrgChart() {
  const box =
    'rounded-2xl border px-3 py-2 text-center text-xs font-semibold sm:px-4 sm:text-sm';
  const plain = `${box} border-graphite/10 bg-graphite/[0.03] text-graphite`;
  const you = `${box} border-[#3da2ee] bg-[#8fd0ff]/30 text-azure`;
  const stem = 'h-5 w-px bg-graphite/25';

  return (
    <figure aria-label="Open Sourcery's structure" className="flex flex-col items-center">
      <div className={plain}>Open Sourcery Leadership</div>
      <div className={stem} />
      <div className={you}>Lead Developers (you)</div>
      <div className={stem} />
      <div className={plain}>Developers</div>
    </figure>
  );
}

export default function LeadDeveloperGuidePage() {
  return (
    <GuidePage
      title="Lead Developer Guide"
      intro={
        <>
          As a Lead Developer at Open Sourcery, you&apos;re the technical heartbeat of your project
          and the bridge between Open Sourcery leadership and your dev team. Your success and your
          team&apos;s success go hand in hand. This guide covers everything you need to set up,
          run, and grow your project.
        </>
      }
      sections={LEAD_DEVELOPER_GUIDE_SECTIONS}
      otherGuide={{
        title: 'Developer Guide',
        href: '/guides/developer',
        blurb: 'What your Developers should know: joining and contributing to a project.',
        tone: 'blue',
      }}
    >
      <GuideSection id="role" title="Your Role & Responsibilities">
        <p>
          Within Open Sourcery, leadership sits at the top of the org, with Lead Devs reporting up
          to leadership, and Developers working under their Lead Dev.
        </p>
        <OrgChart />
        <GuideTopic title="As a Lead Dev, your responsibilities are to:">
          <Bullets
            items={[
              "Lead the design of your project's technical architecture",
              'Assign tasks to your developers at least once every two weeks',
              'Mentor and unblock your devs',
              'Maintain code quality',
              'Communicate with Open Sourcery leadership',
            ]}
          />
        </GuideTopic>
      </GuideSection>

      <GuideSection id="getting-started" title="Getting Started: Setting Up Your Project">
        <Steps
          steps={[
            {
              title: "Register on this website.",
              body: "We'll send you an invite to the Open Sourcery GitHub organization.",
            },
            {
              title: 'Submit a project proposal.',
              body: (
                <>
                  Navigate to <SiteLink href="/project-proposal-form">Start a Project</SiteLink> and
                  fill out the details for your project. On our end, we&apos;ll approve your project and create its
                  repository in our GitHub organization.
                </>
              ),
            },
          ]}
        />
        <GuideTopic title="Once we create your repository:">
          <Bullets
            items={[
              <>
                Teammates can join your project through{' '}
                <SiteLink href="/our-projects">our project portal</SiteLink>.
              </>,
              <>
                After accepting their invites, teammates should run{' '}
                <Code>git clone &lt;repo_url&gt;.git</Code> in their terminal to clone the project
                onto their system.
              </>,
              "Create a GitHub Project in your repository. This becomes your team's Kanban board and sprint tracker.",
            ]}
          />
        </GuideTopic>
      </GuideSection>

      <GuideSection id="running" title="Running Your Project">
        <GuideTopic title="Your GitHub Project Board">
          <p>
            Your project board should be your team&apos;s single source of truth; keep it updated during and
            between meetings. A typical board moves through these columns, left to right:
          </p>
          <BoardColumns />
          <Callout label="Tip">
            Review your board at least once a week to make sure assignments and statuses are
            current.
          </Callout>
        </GuideTopic>

        <GuideTopic title="Writing & Assigning Issues">
          <p>Create issues from your repository&apos;s project board. Every issue should have:</p>
          <Bullets
            items={[
              'A clear title',
              'A scoped description',
              'Acceptance criteria',
              'Labels, such as "enhancement"/"bug," "good first issue," or "help wanted"',
              'An assignee (you or another developer)',
            ]}
          />
          <Callout label="Optional">
            Tag an issue &quot;help wanted&quot; if you&apos;d like to open it up for cross-team
            contribution. These automatically appear on Open Sourcery&apos;s org-wide issue
            tracker, so developers from other projects can pick them up too.
          </Callout>
        </GuideTopic>

        <GuideTopic title="Communicating Tasks">
          <Bullets
            items={[
              'Tell teammates about every task you assign them',
              "Use your project's Discord channel for updates and clarifications",
              'Mention teammates (@username) for faster collaboration',
            ]}
          />
        </GuideTopic>
      </GuideSection>

      <GuideSection id="sprints" title="Sprints & Hack Sessions">
        <GuideTopic title="Running a Sprint">
          <Bullets
            items={[
              'Set scope at the start of the sprint (in Discord or during a hack session)',
              'Hold frequent, ideally weekly, check-ins',
              'Close the loop at the end with a demo or PR review',
            ]}
          />
        </GuideTopic>
        <GuideTopic title="Hack Sessions">
          <p>
            Hack sessions run regularly and give your team dedicated time to work on your project
            together. Use them to unblock teammates and ship features. You can simulate a real
            standup or keep things informal, whatever works best for your team.
          </p>
        </GuideTopic>
      </GuideSection>

      <GuideSection id="team" title="Growing & Supporting Your Team">
        <div className="grid gap-6 md:grid-cols-2">
          <GuideTopic title="Onboarding New Developers">
            <Bullets
              items={[
                'Get them a "good first issue" within their first week',
                'Pair them with someone on the team',
                'Make them feel needed fast',
              ]}
            />
          </GuideTopic>
          <GuideTopic title="Keeping Members Engaged">
            <Bullets
              items={[
                'Give ownership, not just tasks',
                'Celebrate wins',
                'Calibrate difficulty to each developer',
                'Show the bigger picture: help your team see how their work fits into the project as a whole',
              ]}
            />
          </GuideTopic>
          <GuideTopic title="Handling Drop-Off">
            <Bullets
              items={[
                'Watch for silence',
                'Check in 1:1 before assuming the worst',
                'Redistribute their work gracefully',
                'Document what they left behind',
              ]}
            />
          </GuideTopic>
          <GuideTopic title="Passing the Torch">
            <p>
              Document everything as you go. Good documentation keeps a project alive beyond any
              one person.
            </p>
          </GuideTopic>
        </div>
      </GuideSection>

      <GuideSection id="connected" title="Staying Connected">
        <GuideTopic title="Your Project's Discord Channel">
          <p>
            Once your repository is created, your project automatically gets its own private
            Discord channel under the &quot;Projects&quot; category, named to match your project,
            with you already in it. Developers are added to it when they join your project and
            removed if they leave, so there&apos;s nothing to set up or maintain.
          </p>
        </GuideTopic>
        <GuideTopic title="Points of Contact">
          <Bullets
            items={[
              <>
                Email: <EmailLink /> - reach out anytime with questions. You&apos;ll also get
                automatic emails when new members join your project.
              </>,
              <>
                Discord:
                <ul className="mt-1.5 list-[circle] space-y-1.5 pl-5">
                  <li>
                    <Channel name="questions" /> - quick, general questions
                  </li>
                  <li>
                    <Channel name="all-lead-devs" /> - discussion with other Lead Devs
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
