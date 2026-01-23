'use client';

import { useState, useMemo } from 'react';
import { PageContainer, SectionContainer } from '@components/Container';
import { TECHNOLOGIES, TOPICS } from '@data';

interface ProposalData {
  projectName: string;
  description: string;
  yearRange: [number, number];
  technologiesUsed: string[];
  technologiesRequired: string[];
  topics: string[];
  maxTeamSize: number;
}

const YEAR_LABELS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Grad Student'];
const GITHUB_REPO_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const YEAR_MAX = 4;

const ProjectProposalPage = () => {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [yearMin, setYearMin] = useState(1);
  const [yearMax, setYearMax] = useState(3);
  const [technologiesUsed, setTechnologiesUsed] = useState<string[]>([]);
  const [technologiesRequired, setTechnologiesRequired] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState('');
  const [maxTeamSize, setMaxTeamSize] = useState(6);

  const isProjectNameValid = useMemo(
    () => GITHUB_REPO_REGEX.test(projectName),
    [projectName]
  );

  const allTopics = useMemo(
    () => TOPICS.flatMap((group) => group.topics),
    []
  );

  const filteredTopics = useMemo(
    () =>
      allTopics.filter(
        (t) =>
          t.toLowerCase().includes(topicInput.toLowerCase()) &&
          !topics.includes(t)
      ),
    [topicInput, topics, allTopics]
  );

  const yearLabel =
    yearMin === yearMax
      ? YEAR_LABELS[yearMin] === 'Freshman' ? `Freshmen Only` : `${YEAR_LABELS[yearMin]}s Only`
      : `${YEAR_LABELS[yearMin]} – ${YEAR_LABELS[yearMax]}`;

  const minPercent = (yearMin / YEAR_MAX) * 100;
  const maxPercent = (yearMax / YEAR_MAX) * 100;

  const toggleTechnologyUsed = (tech: string) => {
    setTechnologiesUsed((prev) =>
      prev.includes(tech)
        ? prev.filter((t) => t !== tech)
        : [...prev, tech]
    );
    setTechnologiesRequired((prev) => prev.filter((t) => t !== tech));
  };

  const toggleTechnologyRequired = (tech: string) => {
    setTechnologiesRequired((prev) =>
      prev.includes(tech)
        ? prev.filter((t) => t !== tech)
        : [...prev, tech]
    );
  };

  const addTopic = (topic: string) => {
    setTopics((prev) => [...prev, topic]);
    setTopicInput('');
  };

  const submitProposal = () => {
    const data: ProposalData = {
      projectName,
      description,
      yearRange: [yearMin, yearMax],
      technologiesUsed,
      technologiesRequired,
      topics,
      maxTeamSize,
    };
    console.log(data);
  };

  return (
    <PageContainer>
      <SectionContainer>
        <h1 className="text-4xl md:text-6xl font-semibold mb-12 bg-gradient-to-r from-ycs-pink to-ycs-pink text-transparent bg-clip-text">
          Project Proposal
        </h1>

        {/* Project Name */}
        <div className="mb-8">
          <label className="block text-white font-semibold mb-2">
            Project Name
          </label>
          <p className="text-neutral-400 text-sm mb-2">
            This will be the name of your project's GitHub repository.
          </p>
          <input
            className="w-full p-3 rounded bg-neutral-900 text-white border border-neutral-700 focus:outline-none focus:border-ycs-pink"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="my-awesome-project"
          />
          {!isProjectNameValid && projectName.length > 0 && (
            <p className="text-red-400 text-sm mt-2">
              Must be a valid GitHub repository name (lowercase, hyphens only).
            </p>
          )}
        </div>

        {/* Description */}
        <div className="mb-10">
          <label className="block text-white font-semibold mb-1">
            Description
          </label>
          <p className="text-neutral-400 text-sm mb-2">
            This will be used for the description of your GitHub repository.
          </p>
          <textarea
            className="w-full p-3 rounded bg-neutral-900 text-white border border-neutral-700 resize-y max-h-64 focus:outline-none focus:border-ycs-pink"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
          />
        </div>

        {/* Year Range */}
        {/* --- Year Range --- */}
        <div className="mb-12">
          <label className="block text-white font-semibold mb-1">
            Year Range
          </label>
          <p className="text-neutral-400 text-sm mb-5">
            Select the class years this project is intended for.
          </p>

          <div className="relative h-10">
            {/* Track */}
            <div className="absolute top-1/2 -translate-y-1/2 h-1 w-full bg-neutral-700 rounded" />

            {/* Active range */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1 bg-ycs-pink rounded"
              style={{
                left: `${minPercent}%`,
                width: `${maxPercent - minPercent}%`,
              }}
            />

            {/* Min thumb */}
            <input
              type="range"
              min={0}
              max={YEAR_MAX}
              value={yearMin}
              onChange={(e) =>
                setYearMin(Math.min(Number(e.target.value), yearMax))
              }
              className={`relative w-full appearance-none bg-transparent pointer-events-auto`}
            />

            {/* Max thumb */}
            <input
              type="range"
              min={0}
              max={YEAR_MAX}
              value={yearMax}
              onChange={(e) =>
                setYearMax(Math.max(Number(e.target.value), yearMin))
              }
              className="relative w-full appearance-none bg-transparent pointer-events-auto"
            />
          </div>

          <p className="text-neutral-300 mt-4 font-medium">{yearLabel}</p>
        </div>

        {/* Technologies Used */}
        <div className="mb-12">
          <label className="block text-white font-semibold mb-1">
            Technologies Used
          </label>
          <p className="text-neutral-400 text-sm mb-4">
            Select all technologies that will be used in this project.
          </p>

          {TECHNOLOGIES.map((group) => (
            <div key={group.header} className="mb-5">
              <h3 className="text-neutral-300 font-semibold mb-2">
                {group.header}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {group.technologies.map((tech) => (
                  <label
                    key={tech}
                    className="flex items-center gap-2 text-white"
                  >
                    <input
                      type="checkbox"
                      checked={technologiesUsed.includes(tech)}
                      onChange={() => toggleTechnologyUsed(tech)}
                    />
                    {tech}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Technologies Required */}
        <div className="mb-12">
          <label className="block text-white font-semibold mb-1">
            Technologies Required
          </label>
          <p className="text-neutral-400 text-sm mb-4">
            Technologies contributors are expected to already know.
          </p>

          {technologiesUsed.length === 0 ? (
            <p className="text-neutral-500 italic">
              Select technologies above to choose required experience.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {technologiesUsed.map((tech) => (
                <label
                  key={tech}
                  className="flex items-center gap-2 text-white"
                >
                  <input
                    type="checkbox"
                    checked={technologiesRequired.includes(tech)}
                    onChange={() => toggleTechnologyRequired(tech)}
                  />
                  {tech}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Topics */}
        <div className="mb-14 relative">
          <label className="block text-white font-semibold mb-1">
            Topics
          </label>
          <p className="text-neutral-400 text-sm mb-3">
            Topics help others discover your project.
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            {topics.map((topic) => (
              <span
                key={topic}
                className="px-3 py-1 bg-neutral-800 text-white rounded-full text-sm cursor-pointer hover:bg-neutral-700"
                onClick={() =>
                  setTopics((prev) => prev.filter((t) => t !== topic))
                }
              >
                {topic} ×
              </span>
            ))}
          </div>

          <input
            className="w-full p-3 rounded bg-neutral-900 text-white border border-neutral-700 focus:outline-none focus:border-ycs-pink"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            placeholder="Start typing a topic…"
          />

          {topicInput && filteredTopics.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-neutral-900 border border-neutral-700 rounded shadow-lg max-h-48 overflow-y-auto">
              {filteredTopics.map((topic) => (
                <div
                  key={topic}
                  className="px-4 py-2 text-white hover:bg-neutral-800 cursor-pointer"
                  onClick={() => addTopic(topic)}
                >
                  {topic}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Max Team Size */}
        <div className="mb-16 text-center">
          <label className="block text-white font-semibold text-xl mb-2">
            Maximum Team Size
          </label>
          <p className="text-neutral-400 text-sm mb-6">
            Including the project lead (you).
          </p>

          <div className="text-5xl font-bold text-ycs-pink mb-6">
            {maxTeamSize}
          </div>

          <div className="max-w-2xl mx-auto">
            <input
              type="range"
              min={1}
              max={12}
              value={maxTeamSize}
              onChange={(e) => setMaxTeamSize(Number(e.target.value))}
              className="w-full accent-ycs-pink"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="text-center">
          <button
            disabled={!isProjectNameValid}
            onClick={submitProposal}
            className={`px-10 py-4 rounded font-semibold transition
              ${
                isProjectNameValid
                  ? 'bg-ycs-pink text-black hover:opacity-90'
                  : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
              }`}
          >
            Submit Proposal
          </button>
        </div>
      </SectionContainer>
    </PageContainer>
  );
};

export default ProjectProposalPage;
