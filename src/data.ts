/**
 * The club's time zone. Semesters and daily caps turn over at midnight here,
 * not wherever the server happens to be running.
 */
export const CLUB_TIME_ZONE = 'America/New_York';

/** A moment's calendar date in the club's time zone. en-CA formats YYYY-MM-DD. */
function clubDateParts(instant: Date): { year: number; month: number; day: number } {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLUB_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(instant)
    .split('-')
    .map(Number);
  return { year, month: month - 1, day };
}

/** How far the club's clock sits from UTC at a given moment, in milliseconds */
function clubOffset(instant: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CLUB_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(instant));

  const field: Record<string, number> = {};
  for (const part of parts) field[part.type] = Number(part.value);

  const asIfUTC = Date.UTC(
    field.year,
    field.month - 1,
    field.day,
    field.hour % 24, // some platforms write midnight as hour 24
    field.minute,
    field.second
  );
  return asIfUTC - instant;
}

/** The instant midnight arrives in the club's time zone on a given date */
function clubMidnight(year: number, month: number, day: number): Date {
  const utcMidnight = Date.UTC(year, month, day);
  // Shift by the offset, then again by the offset where that lands, in case a
  // daylight saving change falls between the two
  const firstPass = utcMidnight - clubOffset(utcMidnight);
  return new Date(utcMidnight - clubOffset(firstPass));
}

/**
 * Start of the semester currently in progress, so gem counts reset each term.
 * Fall starts August 15 and spring January 15, both at midnight in the club's
 * own time zone; before January 15 we're still in the term that began the
 * previous August.
 */
export function getSemesterStart(now: Date = new Date()): Date {
  const { year } = clubDateParts(now);

  if (now >= fallSemesterStart(year)) return fallSemesterStart(year);
  if (now >= springSemesterStart(year)) return springSemesterStart(year);
  return fallSemesterStart(year - 1);
}

/** Midnight on the day the fall semester starts, in the club's time zone */
function fallSemesterStart(year: number): Date {
  return clubMidnight(year, 7, 15); // August 15
}

/** Midnight on the day the spring semester starts */
function springSemesterStart(year: number): Date {
  return clubMidnight(year, 0, 15); // January 15
}

/**
 * The semester in progress as a label, e.g. "Fall 2026". Early January still
 * belongs to the previous fall, so it's named after the year that began in.
 */
export function getCurrentSemester(now: Date = new Date()): string {
  const { year, month } = clubDateParts(getSemesterStart(now));
  return `${month === 7 ? 'Fall' : 'Spring'} ${year}`;
}

// Class standing, as used by a project's yearRange
export const YEAR_LABELS = [
  'Freshman',
  'Sophomore',
  'Junior',
  'Senior',
  'Grad Student',
];

const GRAD_STUDENT_STANDING = YEAR_LABELS.length - 1;

/**
 * Stored in a user's graduationYear when they're a graduate student rather
 * than an undergrad with a year left to go.
 */
const GRADUATE_STUDENT = 'Graduate Student';

// Graduation years offered: this year through this year + 5
const GRADUATION_YEAR_SPAN = 5;

/**
 * The graduation years a user can pick, newest cohort last, followed by the
 * graduate-student option. Generated from the current year, so the list
 * doesn't have to be edited each year.
 */
export function getGraduationYearOptions(now: Date = new Date()): string[] {
  const startYear = now.getFullYear();
  const years: string[] = [];

  for (let year = startYear; year <= startYear + GRADUATION_YEAR_SPAN; year++) {
    years.push(String(year));
  }

  return [...years, GRADUATE_STUDENT];
}

function isGraduateStudent(graduationYear: string | null): boolean {
  return graduationYear === GRADUATE_STUDENT;
}

/**
 * The academic year a date falls in, named for the spring it ends in. It
 * rolls over when the fall semester starts, so from that day the class of
 * 2030 counts as freshmen.
 */
function getAcademicYear(now: Date = new Date()): number {
  const { year } = clubDateParts(now);
  return now >= fallSemesterStart(year) ? year + 1 : year;
}

/**
 * A user's class standing as an index into YEAR_LABELS (0 = Freshman through
 * 4 = Grad Student), or null if their profile doesn't say.
 *
 * Graduate students are stored as GRADUATE_STUDENT rather than a year, so
 * they're recognised directly instead of being inferred from a date.
 */
export function getClassStanding(
  graduationYear: string | null,
  now: Date = new Date()
): number | null {
  if (!graduationYear) return null;
  if (isGraduateStudent(graduationYear)) return GRAD_STUDENT_STANDING;

  const year = Number(graduationYear);
  if (!Number.isFinite(year)) return null;

  const standing = getAcademicYear(now) + 3 - year;

  // Graduating even later than this year's freshmen still counts as a
  // freshman, and a graduation year that has already passed counts as a
  // graduate student
  return Math.min(Math.max(standing, 0), GRAD_STUDENT_STANDING);
}

/**
 * Describes a project's year range, e.g. "Juniors and Up"
 */
export function formatYearRange(min: number, max: number): string {
  if (min === max) {
    return YEAR_LABELS[min] === 'Freshman'
      ? 'Freshmen Only'
      : `${YEAR_LABELS[min]}s Only`;
  } else if (max === YEAR_LABELS.length - 1) {
    return YEAR_LABELS[min] === 'Freshman'
      ? 'Open to Any'
      : `${YEAR_LABELS[min]}s and Up`;
  }
  return `${YEAR_LABELS[min]} – ${YEAR_LABELS[max]}`;
}

/**
 * Gems awarded for each kind of activity. The server's formula and the gems
 * page's explainer both read from here, so the two can't drift apart.
 */
/**
 * The home page easter egg: one gem a shield, at most five a day, and at most
 * a hundred a semester. Five a day over a whole term would otherwise be worth
 * more than anyone's project work, which would make clicking the crest the
 * winning strategy rather than a bit of fun.
 */
export const SHIELD_GEM_VALUE = 1;
export const SHIELD_GEMS_PER_DAY = 5;
export const SHIELD_GEMS_PER_SEMESTER = 100;

export const GEM_VALUES = {
  /** Hack Sessions and General Body Meetings */
  specialEvent: 50,
  /** Every other event - socials, workshops and so on */
  otherEvent: 30,
  /** Each issue opened in a project you're on */
  issueInOwnProject: 5,
  /** Each PR merged into a project you're on */
  prIntoOwnProject: 40,
  /** Each of a teammate's pull requests you review in your project */
  reviewOnTeammatePR: 15,
  /** Each PR merged into another Open Sourcery project (any org repository) */
  prIntoOtherProject: 60,
} as const;

/** Events whose name marks them as one of the club's own working meetings */
const SPECIAL_EVENT_NAMES = ['hack session', 'gbm', 'general body meeting'];

/** What attending an event is worth, decided by its name */
export function eventGemValue(summary: string): number {
  const name = summary.toLowerCase();
  return SPECIAL_EVENT_NAMES.some((special) => name.includes(special))
    ? GEM_VALUES.specialEvent
    : GEM_VALUES.otherEvent;
}

/**
 * Merged pull requests into public repositories outside Open Sourcery are
 * worth less as they pile up. The first few are the ones the club most wants
 * to encourage, while a working maintainer's fiftieth of the semester
 * shouldn't outweigh everyone else's term of project work.
 *
 * Each tier covers `count` pull requests at `gems` apiece, in the order they
 * were merged. The last tier runs to the end of the semester.
 */
export const PUBLIC_REPO_PR_TIERS = [
  { count: 5, gems: 15 },
  { count: 10, gems: 7 },
  { count: Infinity, gems: 3 },
] as const;

/**
 * What a merged outside pull request is worth, given how many came before it
 * this semester (0 for the first).
 */
export function publicRepoPRValue(precedingCount: number): number {
  let remaining = precedingCount;
  for (const tier of PUBLIC_REPO_PR_TIERS) {
    if (remaining < tier.count) return tier.gems;
    remaining -= tier.count;
  }
  return PUBLIC_REPO_PR_TIERS[PUBLIC_REPO_PR_TIERS.length - 1].gems;
}

/**
 * Why a lead can't leave their own project. Shared by the server, which
 * enforces it, and the Leave buttons, which catch it before asking to confirm.
 */
export function leadCannotLeaveMessage(projectName: string): string {
  return (
    `You're the Lead Developer of "${projectName}", so you can't leave it yet. ` +
    `Transfer leadership to another member first: on the home page, open Edit Project ` +
    `in your project's section.`
  );
}

/** Why a lead can't delete their account while their project is running */
export function leadCannotDeleteMessage(projectName: string): string {
  return (
    `You're the Lead Developer of "${projectName}", so you can't delete your account yet. ` +
    `Transfer leadership to another member first: on the home page, open Edit Project ` +
    `in your project's section.`
  );
}

interface TechnologyGroup {
  header: string,
  technologies: string[]
}

interface TopicGroup {
  header: string,
  topics: string[]
}

type projectStatus = 'PROPOSED' | 'IN_PROGRESS' | 'ARCHIVED';

export interface Project {
  id: string;
  projectName: string;
  description: string;
  yearRange: [number, number];
  technologiesUsed: string[];
  technologiesRequired: string[];
  topics: string[];
  maxTeamSize: number;
  currentTeamSize: number;
  repositoryName: string;
  pointOfContact: string;
  createdAt: Date;
  status: projectStatus;
}

export const TECHNOLOGIES: TechnologyGroup[] = [
  {
    header: 'Core Languages & Platforms',
    technologies: [
      'JavaScript',
      'TypeScript',
      'Python',
      'Java',
      'C',
      'C++',
      'Rust',
      'Go',
    ],
  },

  {
    header: 'Frontend & Mobile',
    technologies: [
      'React',
      'React Native',
      'Next.js',
      'HTML',
      'CSS',
    ],
  },

  {
    header: 'Backend & APIs',
    technologies: [
      'Node.js',
      'Express.js',
      'GraphQL',
    ],
  },

  {
    header: 'AI & Data',
    technologies: [
      'PyTorch',
      'Pandas',
      'Hugging Face'
    ],
  },

  {
    header: 'DevOps & Infra',
    technologies: [
      'Linux',
      'Docker',
      'Kubernetes',
      'Amazon Web Services (AWS)',
      'Google Cloud Platform (GCP)',
      'Microsoft Azure',
      'CI/CD',
      'Git/GitHub',
      'Jenkins'
    ],
  },

  {
    header: 'Databases',
    technologies: [
      'SQL',
      'NoSQL',
      'Firebase',
      'MongoDB',
      'Cassandra',
      'Apache Spark',
      'Redis'
    ],
  },
]

export const TOPICS: TopicGroup[] = [
  {
    header: 'Core Languages & Platforms',
    topics: [
      'javascript',
      'typescript',
      'python',
      'java',
      'c',
      'cpp',
      'rust',
      'go',
    ],
  },

  {
    header: 'Frontend & Mobile',
    topics: [
      'react',
      'react-native',
      'nextjs',
      'web',
      'website',
      'mobile',
      'accessibility',
      'ui-ux',
    ],
  },

  {
    header: 'Backend & APIs',
    topics: [
      'backend',
      'fullstack',
      'nodejs',
      'express',
      'rest-api',
      'graphql',
      'microservices',
    ],
  },

  {
    header: 'AI & Data',
    topics: [
      'machine-learning',
      'deep-learning',
      'nlp',
      'computer-vision',
      'generative-ai',
      'llms',
      'data-science',
      'data-visualization',
    ],
  },

  {
    header: 'Systems, Low-Level & Performance',
    topics: [
      'systems',
      'low-level',
      'operating-systems',
      'embedded',
      'iot',
      'robotics',
      'networking',
      'performance',
    ],
  },

  {
    header: 'DevOps & Infra',
    topics: [
      'linux',
      'docker',
      'kubernetes',
      'cloud',
      'aws',
      'gcp',
      'azure',
      'devops',
      'ci-cd',
    ],
  },

  {
    header: 'Databases',
    topics: [
      'database',
      'sql',
      'nosql',
    ],
  },

  {
    header: 'Security & Crypto',
    topics: [
      'security',
      'cybersecurity',
      'cryptography',
      'blockchain',
      'crypto',
      'web3',
    ],
  },

  {
    header: 'Real-World Domains',
    topics: [
      'healthcare',
      'food',
      'education',
      'finance',
      'fintech',
      'ecommerce',
      'gaming',
      'music',
      'sports',
      'mental-health',
      'agriculture',
      'sustainability',
      'climate',
      'transportation',
      'smart-cities',
      'social-good',
    ],
  },

  {
    header: 'Community & Learning',
    topics: [
      'open-source',
      'hackathon',
      'research',
      'class-project',
    ],
  },
]
