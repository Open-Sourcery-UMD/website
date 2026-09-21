import { Project, TECHNOLOGIES } from '@data';

/**
 * Brand colours for the technologies a project can list, used to theme its
 * card. Several are too dark to read as text on a dark card, so they're
 * lightened by getReadableColor rather than being compromised here.
 */
const TECHNOLOGY_COLORS: Record<string, string> = {
  // Core Languages & Platforms
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572a5',
  Java: '#b07219',
  C: '#a8b9cc',
  'C++': '#00599c',
  Rust: '#dea584',
  Go: '#00add8',

  // Frontend & Mobile
  React: '#61dafb',
  'React Native': '#61dafb',
  'Next.js': '#e5e5e5',
  HTML: '#e34c26',
  CSS: '#563d7c',

  // Backend & APIs
  'Node.js': '#68a063',
  'Express.js': '#b3b3b3',
  GraphQL: '#e10098',

  // AI & Data
  PyTorch: '#ee4c2c',
  Pandas: '#e70488',
  'Hugging Face': '#ffd21e',

  // DevOps & Infra
  Linux: '#fcc624',
  Docker: '#2496ed',
  Kubernetes: '#326ce5',
  'Amazon Web Services (AWS)': '#ff9900',
  'Google Cloud Platform (GCP)': '#4285f4',
  'Microsoft Azure': '#0089d6',
  'CI/CD': '#8a63d2',
  'Git/GitHub': '#f05032',
  Jenkins: '#d33833',

  // Databases
  SQL: '#e38c00',
  NoSQL: '#6bbf59',
  Firebase: '#ffca28',
  MongoDB: '#47a248',
  Cassandra: '#1287b1',
  'Apache Spark': '#e25a1c',
  Redis: '#dc382d',
};

/** Used when a project lists nothing, or something not in the map */
export const DEFAULT_TECHNOLOGY_COLOR = '#90c8ff';

// Text needs to stay legible on the near-black card, so colours below this
// relative luminance are mixed toward white until they clear it
const MIN_TEXT_LUMINANCE = 0.3;

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value;

  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/** WCAG relative luminance, 0 (black) to 1 (white) */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const proportion = channel / 255;
    return proportion <= 0.03928
      ? proportion / 12.92
      : ((proportion + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * How high up the TECHNOLOGIES sections a technology sits. Lower wins, so a
 * project's language beats its tooling. Anything unrecognised sorts last.
 */
function getSectionRank(technology: string): number {
  const index = TECHNOLOGIES.findIndex((group) =>
    group.technologies.includes(technology)
  );
  return index === -1 ? TECHNOLOGIES.length : index;
}

/**
 * The technology a project is themed after.
 *
 * Sections come first, so a project requiring Git/GitHub but written in
 * JavaScript is themed after JavaScript. Within the winning section a
 * required technology beats a merely used one, and ties go to whichever the
 * project listed first.
 */
export function getPrimaryTechnology(project: Project): string | null {
  const required = project.technologiesRequired ?? [];
  const used = project.technologiesUsed ?? [];

  const candidates = [
    ...required.map((technology, order) => ({ technology, isRequired: true, order })),
    ...used
      .filter((technology) => !required.includes(technology))
      .map((technology, order) => ({ technology, isRequired: false, order })),
  ];

  if (candidates.length === 0) return null;

  candidates.sort(
    (a, b) =>
      getSectionRank(a.technology) - getSectionRank(b.technology) ||
      Number(b.isRequired) - Number(a.isRequired) ||
      a.order - b.order
  );

  return candidates[0].technology;
}

/**
 * The brand colour for a technology, for accents where legibility as text
 * doesn't matter (borders, strips, background washes)
 */
export function getTechnologyColor(technology: string | null): string {
  if (!technology) return DEFAULT_TECHNOLOGY_COLOR;
  return TECHNOLOGY_COLORS[technology] ?? DEFAULT_TECHNOLOGY_COLOR;
}

/**
 * The same colour, lightened if needed until it reads clearly as text on a
 * dark background. Keeps the hue, so it still looks like the brand.
 */
export function getReadableColor(color: string): string {
  let [r, g, b] = hexToRgb(color);
  let hex = rgbToHex(r, g, b);

  // Each pass closes a quarter of the remaining distance to white
  for (let pass = 0; pass < 8 && relativeLuminance(hex) < MIN_TEXT_LUMINANCE; pass++) {
    r = Math.round(r + (255 - r) * 0.25);
    g = Math.round(g + (255 - g) * 0.25);
    b = Math.round(b + (255 - b) * 0.25);
    hex = rgbToHex(r, g, b);
  }

  return hex;
}

/**
 * Everything a card needs to theme itself after its main technology
 */
export function getProjectTheme(project: Project): {
  technology: string | null;
  accent: string;
  text: string;
} {
  const technology = getPrimaryTechnology(project);
  const accent = getTechnologyColor(technology);

  return { technology, accent, text: getReadableColor(accent) };
}
