interface TechnologyGroup {
  header: string,
  technologies: string[]
}

interface TopicGroup {
  header: string,
  topics: string[]
}

type projectStatus = 'PROPOSED' | 'IN_PROGRESS';

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
  createdBy: string;
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
