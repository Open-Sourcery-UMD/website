/**
 * Start of the semester currently in progress, so gem counts reset each term.
 * The fall semester starts September 1 and the spring semester January 30;
 * before January 30 we're still in the term that began the previous September.
 */
export function getSemesterStart(now: Date = new Date()): Date {
  const year = now.getFullYear();
  const fallStart = new Date(year, 8, 1); // September 1
  const springStart = new Date(year, 0, 30); // January 30

  if (now >= fallStart) return fallStart;
  if (now >= springStart) return springStart;
  return new Date(year - 1, 8, 1);
}

// Class standing, as used by a project's yearRange
export const YEAR_LABELS = [
  'Freshman',
  'Sophomore',
  'Junior',
  'Senior',
  'Grad Student',
];

export const GRAD_STUDENT_STANDING = YEAR_LABELS.length - 1;

/**
 * Stored in a user's graduationYear when they're a graduate student rather
 * than an undergrad with a year left to go.
 */
export const GRADUATE_STUDENT = 'Graduate Student';

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

export function isGraduateStudent(graduationYear: string | null): boolean {
  return graduationYear === GRADUATE_STUDENT;
}

/**
 * The academic year a date falls in. It rolls over on September 1, so from
 * that date the class of 2030 counts as freshmen.
 */
export function getAcademicYear(now: Date = new Date()): number {
  return now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
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

export const BOARD_MEMBERS = ['Om Arya', 'Shreyas Thirumale', 'Sifene Fufa', 'Lina Hsu', 'Diksha Pal', 'Colin Kurniawan'];

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
