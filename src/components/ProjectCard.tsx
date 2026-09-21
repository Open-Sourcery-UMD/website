import { formatYearRange, getClassStanding, Project } from '@data';
import { useTeamMatching } from '@context/TeamMatchingContext';
import { ProjectLead } from '@/lib/projectService';
import { FaDiscord, FaEnvelope, FaGithub } from 'react-icons/fa';

const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || "Open-Sourcery-UMD";

/**
 * The viewer's relationship to a project, as far as joining it goes:
 * - none:        not on any project, free to join
 * - this:        already on this project
 * - other:       already on a different project
 * - proposal:    has a proposal awaiting review, which blocks joining
 * - checking:    membership still loading
 * - unavailable: membership couldn't be verified, so joining is blocked
 */
export type CardMembership =
  | 'none'
  | 'this'
  | 'other'
  | 'proposal'
  | 'checking'
  | 'unavailable';

interface ProjectCardProps {
  project: Project;
  /** The project's lead developer, once looked up */
  lead?: ProjectLead;
  onJoin?: (project: Project) => void;
  membership?: CardMembership;
  /** Disables the button without changing its label, e.g. while another join runs */
  joinLocked?: boolean;
  joining?: boolean;
}

export const ProjectCard = ({
  project,
  lead,
  onJoin,
  membership = 'none',
  joinLocked = false,
  joining,
}: ProjectCardProps) => {
  const { data } = useTeamMatching();

  const [minYear, maxYear] = project.yearRange;

  // Graduate students are stored as GRADUATE_STUDENT rather than a year, so
  // the standing helper recognises them instead of inferring from a date
  const standing = getClassStanding(data.year);
  const hasGraduationYear = standing !== null;
  const isYearMatch =
    hasGraduationYear && standing >= minYear && standing <= maxYear;

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
        : membership === 'proposal'
          ? 'Proposal pending'
          : membership === 'checking'
            ? 'Checking...'
            : membership === 'unavailable'
              ? 'Unavailable'
              : spotsRemaining <= 0
                ? 'Full'
                : !hasGraduationYear
                  ? 'Set your graduation year'
                  : !isYearMatch
                    ? 'Out of year range'
                    : 'Join';

  return (
    <div
      className={`relative ${spotsRemaining <= 0 && !isMember ? 'opacity-60' : ''} bg-neutral-900 border ${
        isMember ? 'border-ycs-pink' : 'border-neutral-700'
      } rounded-xl p-6 flex flex-col`}
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
            className="text-neutral-400 transition-transform duration-200 group-hover:scale-125 group-hover:text-white"
          />

          {/* Tooltip */}
          <div className="absolute -top-9 right-1/2 translate-x-1/2 
                          bg-black text-white text-xs px-2 py-1 
                          rounded opacity-0 scale-95
                          transition-all duration-200
                          group-hover:opacity-100 group-hover:scale-100
                          pointer-events-none whitespace-nowrap">
            View on GitHub
          </div>
        </div>
      </a>
      <h2 className="text-2xl font-semibold text-white mb-2">
        {project.projectName}
      </h2>

      <p className="text-neutral-400 mb-6">
        {project.description}
      </p>

      {/* Required Technologies */}
      <div className="mb-6">
        <h3 className="text-white font-semibold mb-2">
          Required Technologies
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {project.technologiesRequired.length > 0
            ? project.technologiesRequired.map((tech) => {
              const has = data.technologies.includes(tech);
              return (
                <div key={tech} className="flex items-center gap-2 text-white">
                  <span className={has ? 'text-green-400' : 'text-red-400'}>
                    {has ? '✔' : '✖'}
                  </span>
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
          <h3 className="text-white font-semibold mb-2">
            Other Technologies
          </h3>
          <div className="grid grid-cols-2 gap-2 text-neutral-300">
            {otherTechnologies.map((tech) => (
                <div key={tech}>{tech}</div>
              ))}
          </div>
        </div>}

      {/* Topics */}
      <div className="flex flex-wrap gap-2 mb-4">
        {project.topics.map((topic) => {
          const preferred = data.topics.includes(topic);
          return (
            <span
              key={topic}
              className={`px-3 py-1 rounded-full text-sm ${
                preferred
                  ? 'bg-ycs-pink text-black'
                  : 'bg-neutral-800 text-white'
              }`}
            >
              {topic}
            </span>
          );
        })}
      </div>

      {/* Year Range */}
      <div className="flex items-center gap-2 text-white mb-2">
        <span className={isYearMatch ? 'text-green-400' : 'text-red-400'}>
          {isYearMatch ? '✔' : '✖'}
        </span>
        Year Range:
        <span className="font-medium">
         {formatYearRange(minYear, maxYear)}
        </span>
      </div>

      {/* Team Size */}
      <div className="text-neutral-300 mb-4">
        Team Size: {project.maxTeamSize}{' '}
        <span className="text-neutral-400">
          ({Math.max(spotsRemaining, 0)} spot{spotsRemaining !== 1 ? 's' : ''} remaining{spotsRemaining <= 0 && ' - FULL'})
        </span>
      </div>

      {/* Lead Developer - a contact, not another project fact, so it's set
          apart from the plain rows above */}
      {lead && (
        <div className="flex items-center gap-3 mb-6 px-3 py-2.5 rounded-lg bg-neutral-800/40 border border-neutral-700/60">
          <div className="w-8 h-8 shrink-0 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-semibold">
            {leadInitials || '?'}
          </div>

          <div className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-ycs-pink">
              Lead Developer
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm text-white truncate">{lead.name}</span>
              {lead.discordUsername && (
                <span
                  title={`Discord: ${lead.discordUsername}`}
                  className="flex items-center gap-1 shrink-0 max-w-[50%] text-xs text-neutral-500"
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
                className="p-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition"
              >
                <FaGithub size={14} />
              </a>
            )}
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                title={`Email ${lead.name}`}
                aria-label={`Email ${lead.name}, the lead developer`}
                className="p-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition"
              >
                <FaEnvelope size={14} />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Join Button */}
      <button
        disabled={isFullOrDisabled || joining}
        onClick={() => onJoin?.(project)}
        className={`mt-auto w-full py-3 rounded font-semibold transition ${
          !isFullOrDisabled && !joining
            ? 'bg-ycs-pink text-black hover:opacity-90 cursor-pointer'
            : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
        }`}
      >
        {buttonLabel}
      </button>
    </div>
  );
};
