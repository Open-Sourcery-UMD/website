'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  FaCodeBranch,
  FaDiscord,
  FaEnvelope,
  FaExclamationCircle,
  FaGithub,
  FaStar,
} from 'react-icons/fa';
import { formatYearRange, Project } from '@data';
import { useAuth } from '@context/AuthContext';
import { useUserProjects } from '@hooks/useUserProjects';
import { SectionContainer } from '@components/Container';
import {
  getProjectById,
  getProjectTeamMembers,
  getRepositoryMembers,
  ProjectTeamMember,
  RepositoryMembership,
} from '@/lib/projectService';
import {
  ActivityItem,
  getProjectOverview,
  ProjectOverview,
} from '@/lib/githubService';
import ProjectSettingsModal from './ProjectSettingsModal';

const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || 'Open-Sourcery-UMD';

const MAX_COMMITS = 5;
const MAX_OPEN = 4;
const MAX_CLOSED = 3;

/**
 * Renders a timestamp as a short relative age, falling back to a date once
 * something is more than a month old.
 */
function formatRelative(dateString: string | null): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const Card = ({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
        {title}
      </h3>
      {action}
    </div>
    {children}
  </div>
);

const EmptyRow = ({ text }: { text: string }) => (
  <p className="text-sm text-neutral-500">{text}</p>
);

const ActivityRow = ({ item }: { item: ActivityItem }) => {
  const closed = item.state === 'closed';
  const dotColor = item.merged
    ? 'text-purple-400'
    : closed
      ? 'text-red-400'
      : 'text-green-400';

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2 py-1.5 group"
    >
      <span className={`mt-1 text-[10px] ${dotColor}`}>●</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-neutral-200 truncate group-hover:text-ycs-pink transition">
          {item.title}
        </span>
        <span className="block text-xs text-neutral-500">
          #{item.number} by {item.authorLogin} ·{' '}
          {formatRelative(closed ? item.closedAt : item.createdAt)}
          {item.merged && ' · merged'}
        </span>
      </span>
    </a>
  );
};

const ActivityCard = ({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: ActivityItem[];
}) => {
  const open = items.filter((item) => item.state === 'open').slice(0, MAX_OPEN);
  const closed = items
    .filter((item) => item.state === 'closed')
    .slice(0, MAX_CLOSED);

  return (
    <Card
      title={title}
      action={
        <span className="flex items-center gap-1 text-xs text-neutral-500">
          {icon}
          {open.length} open
        </span>
      }
    >
      <div className="space-y-1">
        {open.length === 0 && closed.length === 0 ? (
          <EmptyRow text={`No ${title.toLowerCase()} yet.`} />
        ) : (
          <>
            {open.length > 0 ? (
              open.map((item) => <ActivityRow key={item.number} item={item} />)
            ) : (
              <EmptyRow text="Nothing open right now." />
            )}

            {closed.length > 0 && (
              <div className="pt-3 mt-2 border-t border-neutral-800">
                <p className="text-xs uppercase tracking-wide text-neutral-600 mb-1">
                  Recently closed
                </p>
                {closed.map((item) => (
                  <ActivityRow key={item.number} item={item} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

const TeamCard = ({ members }: { members: ProjectTeamMember[] }) => (
  <Card
    title="Team"
    action={
      <span className="text-xs text-neutral-500">
        {members.length} member{members.length !== 1 ? 's' : ''}
      </span>
    }
  >
    {members.length === 0 ? (
      <EmptyRow text="No team members found." />
    ) : (
      <div className="space-y-3">
        {members.map((member) => (
          <div key={member.uid} className="flex items-center gap-3">
            <div className="w-8 h-8 shrink-0 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-semibold">
              {(member.firstName[0] || '?').toUpperCase()}
              {(member.lastName[0] || '').toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white truncate">
                  {member.firstName} {member.lastName}
                </span>
                {member.isLead && (
                  <span className="shrink-0 px-2 py-0.5 rounded-full bg-ycs-pink/15 text-ycs-pink text-[10px] font-semibold uppercase tracking-wide">
                    Lead
                  </span>
                )}
                {member.pending && (
                  <span
                    title="Invited to the repository but hasn't accepted yet"
                    className="shrink-0 px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-[10px] font-semibold uppercase tracking-wide"
                  >
                    Invited
                  </span>
                )}
              </div>
              {member.gitHubOnly ? (
                <span className="block text-xs text-neutral-500 truncate">
                  GitHub collaborator - no Open Sourcery account
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-neutral-500 truncate">
                  <FaDiscord size={12} className="shrink-0" />
                  {member.discordUsername || 'No Discord username'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {member.gitHubUsername && (
                <a
                  href={`https://github.com/${member.gitHubUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`@${member.gitHubUsername} on GitHub`}
                  className="text-neutral-500 hover:text-white transition"
                >
                  <FaGithub size={16} />
                </a>
              )}
              {member.email && (
                <a
                  href={`mailto:${member.email}`}
                  title={`Email ${member.email}`}
                  className="text-neutral-500 hover:text-white transition"
                >
                  <FaEnvelope size={16} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </Card>
);

const CommitsCard = ({ overview }: { overview: ProjectOverview }) => (
  <Card title="Recent Commits">
    {overview.commits.length === 0 ? (
      <EmptyRow text="No commits yet." />
    ) : (
      <div className="space-y-2">
        {overview.commits.slice(0, MAX_COMMITS).map((commit) => (
          <a
            key={commit.sha}
            href={commit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <span className="block text-sm text-neutral-200 truncate group-hover:text-ycs-pink transition">
              {commit.message}
            </span>
            <span className="block text-xs text-neutral-500">
              {commit.authorName} · {formatRelative(commit.date)}
            </span>
          </a>
        ))}
      </div>
    )}
  </Card>
);

interface ProjectSectionProps {
  initialProject: Project;
  /** Already-loaded membership for this project's repository */
  repositoryMembers?: RepositoryMembership;
  /** The viewer's own invitation hasn't been accepted yet */
  viewerPending: boolean;
}

const ProjectSection = ({
  initialProject,
  repositoryMembers,
  viewerPending,
}: ProjectSectionProps) => {
  const { firebaseUser } = useAuth();

  const [project, setProject] = useState<Project>(initialProject);
  const [members, setMembers] = useState<ProjectTeamMember[]>([]);
  const [overview, setOverview] = useState<ProjectOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const loadDetails = useCallback(
    async (current: Project) => {
      setLoading(true);
      try {
        // The roster and the GitHub data are independent, so fetch in parallel
        const [fetchedMembers, fetchedOverview] = await Promise.all([
          getProjectTeamMembers(current, repositoryMembers),
          getProjectOverview(current.repositoryName),
        ]);

        setMembers(fetchedMembers);
        setOverview(fetchedOverview);
      } catch (error) {
        console.error(`Error loading project ${current.projectName}:`, error);
      } finally {
        setLoading(false);
      }
    },
    [repositoryMembers]
  );

  useEffect(() => {
    setProject(initialProject);
    loadDetails(initialProject);
  }, [initialProject, loadDetails]);

  // Edits and leadership transfers change the project document, and the
  // roster's Lead badge is derived from it, so re-read both
  const handleSaved = async () => {
    const updated = await getProjectById(project.id);
    if (!updated) return;

    setProject(updated);
    await loadDetails(updated);
  };

  const isLead =
    Boolean(project.pointOfContact) &&
    project.pointOfContact === firebaseUser?.uid;

  const repository = overview?.repository ?? null;
  const repoUrl =
    repository?.url || `https://github.com/${GITHUB_ORG}/${project.repositoryName}`;

  return (
    <>
      <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
        Your Project:{' '}
        <span className="text-ycs-pink">&apos;{project.projectName}&apos;</span>
      </h2>

      {viewerPending && (
        <div className="mb-4 p-3 rounded-lg bg-ycs-pink/10 border border-ycs-pink/30 text-sm text-neutral-200">
          Your invitation to this project&apos;s repository is pending &mdash;{' '}
          <a
            href={`https://github.com/${GITHUB_ORG}/${project.repositoryName}/invitations`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ycs-pink underline"
          >
            accept it on GitHub
          </a>{' '}
          to start contributing.
        </div>
      )}

      {loading ? (
        <p className="text-neutral-500">Loading project...</p>
      ) : (
        <div className="space-y-4">
          {/* Repository header */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-lg font-semibold text-white">
                  {repository?.name || project.repositoryName}
                </span>
                <span className="flex items-center gap-1 text-sm text-neutral-400">
                  <FaStar size={13} className="text-sparkle-gold" />
                  {repository?.stars ?? 0}
                </span>
                <span className="flex items-center gap-1 text-sm text-neutral-400">
                  <FaCodeBranch size={13} />
                  {repository?.forks ?? 0}
                </span>
                {repository?.language && (
                  <span className="text-sm text-neutral-500">
                    {repository.language}
                  </span>
                )}
                {project.status === 'ARCHIVED' && (
                  <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-[10px] font-semibold uppercase tracking-wide">
                    Archived
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-500 mt-1 line-clamp-2">
                {repository?.description || project.description}
              </p>
              <p className="text-xs text-neutral-600 mt-1">
                {formatYearRange(project.yearRange[0], project.yearRange[1])} ·{' '}
                {members.length}/{project.maxTeamSize} developers
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isLead && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-800 text-neutral-200 hover:bg-neutral-700 transition"
                >
                  Edit Project
                </button>
              )}
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-ycs-pink text-black hover:opacity-90 transition"
              >
                <FaGithub size={16} />
                View Repository
              </a>
            </div>
          </div>

          {/* Detail cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TeamCard members={members} />
            {overview && <CommitsCard overview={overview} />}
            {overview && (
              <ActivityCard
                title="Pull Requests"
                icon={<FaCodeBranch size={11} />}
                items={overview.pullRequests}
              />
            )}
            {overview && (
              <ActivityCard
                title="Issues"
                icon={<FaExclamationCircle size={11} />}
                items={overview.issues}
              />
            )}
          </div>
        </div>
      )}

      {showSettings && firebaseUser && (
        <ProjectSettingsModal
          project={project}
          members={members}
          currentUid={firebaseUser.uid}
          onClose={() => setShowSettings(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
};

/**
 * One section per project the signed-in user is on.
 *
 * That's normally zero or one, but access granted directly on GitHub can put
 * someone on several projects, and each gets its own section.
 */
const ProjectDashboard = () => {
  const { projects, pendingProjectIds, membership, loading } = useUserProjects();

  if (loading || projects.length === 0) return null;

  return (
    <>
      {projects.map((project) => (
        <SectionContainer key={project.id}>
          <ProjectSection
            initialProject={project}
            repositoryMembers={
              membership ? getRepositoryMembers(membership, project) : undefined
            }
            viewerPending={pendingProjectIds.has(project.id)}
          />
        </SectionContainer>
      ))}
    </>
  );
};

export default ProjectDashboard;
