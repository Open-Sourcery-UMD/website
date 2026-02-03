'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer, SectionContainer } from '@components/Container';
import { TECHNOLOGIES, TOPICS } from '@data';
import { useTeamMatching } from '@context/TeamMatchingContext';

const YEAR_LABELS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Grad Student'];
const TOPICS_MAX = 20;

export default function TeamMatchingFormPage() {
  const router = useRouter();
  const { setData } = useTeamMatching();

  const [year, setYear] = useState<number | null>(null);
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState('');

  const allTopics = useMemo(
    () => TOPICS.flatMap((g) => g.topics),
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

  const submit = () => {
    setData({ year, technologies, topics });
    router.push('/team-matching-portal');
  };

  return (
    <PageContainer>
      <SectionContainer>
        <h1 className="text-4xl md:text-6xl font-semibold mb-12 text-ycs-pink">
          Team Matching Form
        </h1>

        {/* Year */}
        <div className="mb-10">
          <label className="block text-white font-semibold mb-2">Year</label>
          <select
            className="w-full p-3 rounded bg-neutral-900 text-white border border-neutral-700"
            value={year ?? ''}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            <option value="" disabled>Select your year</option>
            {YEAR_LABELS.map((label, i) => (
              <option key={label} value={i}>{label}</option>
            ))}
          </select>
        </div>

        {/* Technologies */}
        <div className="mb-12">
          <label className="block text-white font-semibold mb-4">
            Technologies You Have Experience With
          </label>

          {TECHNOLOGIES.map((group) => (
            <div key={group.header} className="mb-5">
              <h3 className="text-neutral-300 font-semibold mb-2">
                {group.header}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {group.technologies.map((tech) => (
                  <label key={tech} className="flex items-center gap-2 text-white">
                    <input
                      type="checkbox"
                      checked={technologies.includes(tech)}
                      onChange={() =>
                        setTechnologies((prev) =>
                          prev.includes(tech)
                            ? prev.filter((t) => t !== tech)
                            : [...prev, tech]
                        )
                      }
                    />
                    {tech}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Topics */}
        <div className="mb-14 relative">
          <label className="block text-white font-semibold mb-2">
            Preferred Topics (up to 20)
          </label>

          <div className="flex flex-wrap gap-2 mb-3">
            {topics.map((topic) => (
              <span
                key={topic}
                className="px-3 py-1 bg-neutral-800 text-white rounded-full text-sm cursor-pointer"
                onClick={() => setTopics((prev) => prev.filter((t) => t !== topic))}
              >
                {topic} ×
              </span>
            ))}
          </div>

          <input
            className="w-full p-3 rounded bg-neutral-900 text-white border border-neutral-700"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            placeholder="Start typing a topic…"
          />

          {topicInput && filteredTopics.length > 0 && topics.length < TOPICS_MAX && (
            <div className="absolute z-10 w-full mt-1 bg-neutral-900 border border-neutral-700 rounded max-h-48 overflow-y-auto">
              {filteredTopics.map((topic) => (
                <div
                  key={topic}
                  className="px-4 py-2 text-white hover:bg-neutral-800 cursor-pointer"
                  onClick={() => {
                    setTopics((prev) => [...prev, topic]);
                    setTopicInput('');
                  }}
                >
                  {topic}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="text-center">
          <button
            onClick={submit}
            className="px-10 py-4 rounded font-semibold bg-ycs-pink text-black hover:opacity-90"
          >
            Find Projects
          </button>
        </div>
      </SectionContainer>
    </PageContainer>
  );
}
