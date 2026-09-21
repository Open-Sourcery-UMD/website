import { formatYearRange, getClassStanding, Project } from '@data';
import { useTeamMatching } from '@context/TeamMatchingContext';
import { ProjectLead } from '@/lib/projectService';
import { getProjectTheme } from '@/lib/technologyTheme';
import { FaDiscord, FaEnvelope, FaGithub } from 'react-icons/fa';

const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || "Open-Sourcery-UMD";

/**
 * The viewer's relationship to a project, as far as joining it goes:
 * - none:        not on any project, free to join
 * - this:        already on this project
 * - other:       already on a different project
 * - invited:     has an unanswered invitation to a different project
 * - proposal:    has a proposal awaiting review, which blocks joining
 * - checking:    membership still loading
 * - unavailable: membership couldn't be verified, so joining is blocked
 * - signed-out:  a visitor browsing without an account
 * - unverified:  signed in, but joining needs a verified email
 */
export type CardMembership =
  | 'none'
  | 'this'
  | 'other'
  | 'invited'
  | 'proposal'
  | 'checking'
  | 'unavailable'
  | 'signed-out'
  | 'unverified';

interface ProjectCardProps {
  project: Project;
  /** The project's lead developer, once looked up */
  lead?: ProjectLead;
  onJoin?: (project: Project) => void;
  /** Offered in place of Join on the viewer's own project */
  onLeave?: (project: Project) => void;
  membership?: CardMembership;
  /** Disables the button without changing its label, e.g. while another join runs */
  joinLocked?: boolean;
  joining?: boolean;
  leaving?: boolean;
}

export const ProjectCard = ({
  project,
  lead,
  onJoin,
  onLeave,
  membership = 'none',
  joinLocked = false,
  joining,
  leaving = false,
}: ProjectCardProps) => {
  const { data } = useTeamMatching();

  const [minYear, maxYear] = project.yearRange;

  // Graduate students are stored as GRADUATE_STUDENT rather than a year, so
  // the standing helper recognises them instead of inferring from a date
  const standing = getClassStanding(data.year);
  const hasGraduationYear = standing !== null;
  const isYearMatch =
    hasGraduationYear && standing >= minYear && standing <= maxYear;

  // A visitor has no profile to compare against, so the fit markers go
  // neutral rather than marking every requirement as unmet
  const showFit = membership !== 'signed-out';

  const spotsRemaining = project.maxTeamSize - project.currentTeamSize;
  const isMember = membership === 'this';
  const isFullOrDisabled =
    spotsRemaining <= 0 ||
    !isYearMatch ||
    membership !== 'none' ||
    joinLocked;

  const otherTechnologies = project.technologiesUsed.filter(
    (t) => !project.technologiesRequired.includes(t)
  );

  // Cards are themed after their main technology - the highest TECHNOLOGIES
  // section they touch, preferring required entries within it
  const theme = getProjectTheme(project);

  const leadInitials = (lead?.name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  // Membership outranks capacity: "you're on this" matters more than "it's full"
  const buttonLabel = joining
    ? 'Joining...'
    : membership === 'this'
      ? 'Already on this project'
      : membership === 'other'
        ? 'Already on a project'
        : membership === 'invited'
          ? 'Respond to your invite first'
          : membership === 'proposal'
          ? 'Proposal pending'
          : membership === 'checking'
            ? 'Checking...'
            : membership === 'unavailable'
              ? 'Unavailable'
              : membership === 'signed-out'
                ? 'Sign in to join'
                : membership === 'unverified'
                  ? 'Verify your email to join'
                  : spotsRemaining <= 0
                ? 'Full'
                : !hasGraduationYear
                  ? 'Set your graduation year'
                  : !isYearMatch
                    ? 'Out of year range'
                    : `Join '${project.projectName}'`;

  return (
    <div
      className={`relative ${spotsRemaining <= 0 && !isMember ? 'opacity-60' : ''} surface ${
        isMember ? 'ring-2 ring-azure/60' : ''
      } card-glow rounded-3xl p-6 flex flex-col`}
      style={{
        // Hover glow in the theme colour; 73 and 59 are ~45% and ~35% alpha
        ['--glow' as string]: `${theme.accent}73`,
        ['--glow-edge' as string]: `${theme.accent}59`,
        // The pink border marks the viewer's own project, so the theme gives
        // way to it there; 59 and 14 are ~35% and ~8% alpha
        ...(isMember
          ? {}
          : { borderColor: `${theme.accent}59`, borderTopColor: theme.accent, borderTopWidth: 3 }),
        backgroundImage: `linear-gradient(180deg, ${theme.accent}14, transparent 45%)`,
      }}
    >
      <a
        href={`https://github.com/${GITHUB_ORG}/${project.repositoryName}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-4 right-4 group"
      >
        <div className="relative">
          {/* Icon */}
          <FaGithub
            size={22}
            className="text-graphite-soft transition-transform duration-200 group-hover:scale-125 group-hover:text-graphite"
          />

          {/* Tooltip */}
          {/* Dark pill, light label - it had ended up near-black on black,
              which read as an empty bar above the icon */}
          <div className="absolute -top-9 right-1/2 translate-x-1/2
                          bg-graphite/95 text-white text-[11px] px-2.5 py-1
                          rounded-full shadow-card opacity-0 scale-95
                          transition-all duration-200
                          group-hover:opacity-100 group-hover:scale-100
                          pointer-events-none whitespace-nowrap">
            View on GitHub
          </div>
        </div>
      </a>
      <h2 className="text-2xl font-semibold text-graphite mb-2">
        {project.projectName}
      </h2>

      {theme.technology && (
        <span
          className="inline-flex self-start items-center gap-1.5 px-2.5 py-1 mb-3 rounded-full text-xs font-medium"
          style={{ backgroundColor: `${theme.accent}1f`, color: theme.text }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: theme.accent }}
          />
          {theme.technology}
        </span>
      )}

      <p className="text-graphite-soft mb-6">
        {project.description}
      </p>

      {/* Required Technologies */}
      <div className="mb-6">
        <h3 className="text-graphite font-semibold mb-2">
          Required Technologies
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {project.technologiesRequired.length > 0
            ? project.technologiesRequired.map((tech) => {
              const has = data.technologies.includes(tech);
              return (
                <div key={tech} className="flex items-center gap-2 text-graphite">
                  {showFit ? (
                    <span className={has ? 'text-green-400' : 'text-red-400'}>
                      {has ? '✔' : '✖'}
                    </span>
                  ) : (
                    <span className="text-graphite-mute">&bull;</span>
                  )}
                  {tech}
                </div>
              );
            })
          : "N/A"
          }
        </div>
      </div>

      {/* Other Technologies */}
      {otherTechnologies.length > 0 &&
        <div className="mb-6">
          <h3 className="text-graphite font-semibold mb-2">
            Other Technologies
          </h3>
          <div className="grid grid-cols-2 gap-2 text-graphite-soft">
            {otherTechnologies.map((tech) => (
                <div key={tech}>{tech}</div>
              ))}
          </div>
        </div>}

      {/* Topics */}
      <div className="flex flex-wrap gap-2 mb-4">
        {project.topics.map((topic) => {
          // Like the fit markers, a visitor has no interests to highlight
          const preferred = showFit && data.topics.includes(topic);
          return (
            <span
              key={topic}
              className={`px-3 py-1 rounded-full text-sm ${
                preferred
                  ? 'y2k-button text-white'
                  : 'bg-graphite/[0.06] text-graphite'
              }`}
            >
              {topic}
            </span>
          );
        })}
      </div>

      {/* Year Range */}
      <div className="flex items-center gap-2 text-graphite mb-2">
        {showFit && (
          <span className={isYearMatch ? 'text-green-400' : 'text-red-400'}>
            {isYearMatch ? '✔' : '✖'}
          </span>
        )}
        Year Range:
        <span className="font-medium">
         {formatYearRange(minYear, maxYear)}
        </span>
      </div>

      {/* Team Size */}
      <div className="text-graphite-soft mb-4">
        Team Size: {project.maxTeamSize}{' '}
        <span className="text-graphite-soft">
          ({Math.max(spotsRemaining, 0)} spot{spotsRemaining !== 1 ? 's' : ''} remaining{spotsRemaining <= 0 && ' - FULL'})
        </span>
      </div>

      {/* Lead Developer - a contact, not another project fact, so it's set
          apart from the plain rows above */}
      {lead && (
        <div className="flex items-center gap-3 mb-6 px-3 py-2.5 rounded-lg bg-white/60 border border-black/10/60">
          <div className="w-8 h-8 shrink-0 rounded-full bg-graphite/[0.06] text-graphite-soft flex items-center justify-center text-xs font-semibold">
            {leadInitials || '?'}
          </div>

          <div className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-azure">
              Lead Developer
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm text-graphite truncate">{lead.name}</span>
              {lead.discordUsername && (
                <span
                  title={`Discord: ${lead.discordUsername}`}
                  className="flex items-center gap-1 shrink-0 max-w-[50%] text-xs text-graphite-mute"
                >
                  <FaDiscord size={12} className="shrink-0" />
                  <span className="truncate">{lead.discordUsername}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {lead.gitHubUsername && (
              <a
                href={`https://github.com/${lead.gitHubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`@${lead.gitHubUsername} on GitHub`}
                // Distinguished from the repository link in the card's corner
                aria-label={`${lead.name}'s GitHub profile`}
                className="p-2 rounded-lg bg-graphite/[0.06] text-graphite-soft hover:bg-graphite/10 hover:text-azure transition"
              >
                <FaGithub size={14} />
              </a>
            )}
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                title={`Email ${lead.name}`}
                aria-label={`Email ${lead.name}, the lead developer`}
                className="p-2 rounded-lg bg-graphite/[0.06] text-graphite-soft hover:bg-graphite/10 hover:text-azure transition"
              >
                <FaEnvelope size={14} />
              </a>
            )}
          </div>
        </div>
      )}

      {/* On your own project: a quiet way out rather than a dead button */}
      {isMember ? (
        <button
          disabled={leaving || joinLocked}
          onClick={() => onLeave?.(project)}
          className="mt-auto w-full border border-red-200 bg-red-50/80 py-3 font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {leaving ? 'Leaving...' : 'Leave this project'}
        </button>
      ) : (
      /* Join Button */
      <button
        disabled={isFullOrDisabled || joining}
        onClick={() => onJoin?.(project)}
        className={`mt-auto w-full py-3 rounded font-semibold transition ${
          !isFullOrDisabled && !joining
            ? 'y2k-button text-white hover:opacity-90 cursor-pointer'
            : 'bg-graphite/[0.07] text-graphite-mute cursor-not-allowed'
        }`}
      >
        {buttonLabel}
      </button>
      )}
    </div>
  );
};
