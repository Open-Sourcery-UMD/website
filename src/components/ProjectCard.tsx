import { Project } from '@data';
import { useTeamMatching } from '@context/TeamMatchingContext';

export const YEAR_LABELS = [
  'Freshman',
  'Sophomore',
  'Junior',
  'Senior',
  'Grad Student',
];

export const formatYearRange = (min: number, max: number) => {
  if (min === max) {
    return YEAR_LABELS[min] === 'Freshman'
      ? 'Freshmen Only'
      : `${YEAR_LABELS[min]}s Only`;
  }
  return `${YEAR_LABELS[min]} – ${YEAR_LABELS[max]}`;
};

interface ProjectCardProps {
  project: Project;
  onJoin?: (project: Project) => void;
  joinDisabled?: boolean;
  joining?: boolean;
}

export const ProjectCard = ({ project, onJoin, joinDisabled, joining }: ProjectCardProps) => {
  const { data } = useTeamMatching();

  const userYear = data.year;
  const [minYear, maxYear] = project.yearRange;
  const currentYear = new Date().getFullYear();
  const [minGradYear, maxGradYear] = [currentYear - maxYear + 3, currentYear - minYear + 3]

  const isYearMatch =
    userYear !== null && Number(userYear) >= minGradYear && Number(userYear) <= maxGradYear;

  const spotsRemaining = project.maxTeamSize - project.currentTeamSize;
  const isFullOrDisabled = spotsRemaining <= 0 || joinDisabled;

  const otherTechnologies = project.technologiesUsed.filter((t) => !project.technologiesRequired.includes(t));

  const buttonLabel = joining
    ? 'Joining...'
    : joinDisabled
      ? 'Already in a project'
      : spotsRemaining <= 0
        ? 'Full'
        : 'Join';

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 flex flex-col">
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
          {project.technologiesRequired.map((tech) => {
            const has = data.technologies.includes(tech);
            return (
              <div key={tech} className="flex items-center gap-2 text-white">
                <span className={has ? 'text-green-400' : 'text-red-400'}>
                  {has ? '✔' : '✖'}
                </span>
                {tech}
              </div>
            );
          })}
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
      <div className="text-neutral-300 mb-6">
        Team Size: {project.maxTeamSize}{' '}
        <span className="text-neutral-400">
          ({spotsRemaining} spot{spotsRemaining !== 1 ? 's' : ''} remaining)
        </span>
      </div>

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
