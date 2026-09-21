'use client';

import { useMemo, useState } from 'react';
import { Project, TECHNOLOGIES, YEAR_LABELS } from '@data';
import {
  ProjectTeamMember,
  transferProjectLeadership,
  updateProjectDetails,
} from '@/lib/projectService';

interface ProjectSettingsModalProps {
  project: Project;
  members: ProjectTeamMember[];
  currentUid: string;
  onClose: () => void;
  onSaved: () => void;
}

const Pill = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1 rounded-full text-sm transition ${
      active
        ? 'bg-ycs-pink text-black font-medium'
        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
    }`}
  >
    {label}
  </button>
);

const ProjectSettingsModal = ({
  project,
  members,
  currentUid,
  onClose,
  onSaved,
}: ProjectSettingsModalProps) => {
  const allTechnologies = useMemo(
    () => TECHNOLOGIES.flatMap((group) => group.technologies),
    []
  );

  const [technologiesUsed, setTechnologiesUsed] = useState<string[]>(
    project.technologiesUsed ?? []
  );
  const [technologiesRequired, setTechnologiesRequired] = useState<string[]>(
    project.technologiesRequired ?? []
  );
  const [yearMin, setYearMin] = useState(project.yearRange?.[0] ?? 0);
  const [yearMax, setYearMax] = useState(
    project.yearRange?.[1] ?? YEAR_LABELS.length - 1
  );
  const [newLeadUid, setNewLeadUid] = useState('');

  const [saving, setSaving] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState('');

  // Leadership can only go to an active member with an Open Sourcery account
  const otherMembers = members.filter(
    (member) =>
      member.uid !== currentUid && !member.pending && !member.gitHubOnly
  );

  const toggleUsed = (tech: string) => {
    setTechnologiesUsed((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );
    // A technology that is no longer used can't stay a requirement
    setTechnologiesRequired((prev) => prev.filter((t) => t !== tech));
  };

  const toggleRequired = (tech: string) => {
    setTechnologiesRequired((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );
  };

  const handleMinYearChange = (value: number) => {
    setYearMin(value);
    if (value > yearMax) setYearMax(value);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      await updateProjectDetails(project.id, {
        technologiesRequired,
        technologiesUsed,
        yearRange: [yearMin, yearMax],
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async () => {
    const newLead = otherMembers.find((member) => member.uid === newLeadUid);
    if (!newLead) return;

    const confirmed = window.confirm(
      `Make ${newLead.firstName} ${newLead.lastName} the Lead Developer of ` +
        `"${project.projectName}"? You will become a regular Developer and ` +
        `lose access to these settings.`
    );
    if (!confirmed) return;

    setTransferring(true);
    setError('');

    try {
      await transferProjectLeadership(project.id, newLeadUid);
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to transfer leadership.'
      );
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-neutral-900 border border-neutral-700 rounded-xl p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white">Edit Project</h3>
            <p className="text-sm text-neutral-400">{project.projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Technologies used */}
        <div className="mb-6">
          <h4 className="text-white font-medium mb-1">Technologies</h4>
          <p className="text-xs text-neutral-500 mb-3">
            Everything the project uses. Mark the must-haves as required below.
          </p>
          <div className="flex flex-wrap gap-2">
            {allTechnologies.map((tech) => (
              <Pill
                key={tech}
                label={tech}
                active={technologiesUsed.includes(tech)}
                onClick={() => toggleUsed(tech)}
              />
            ))}
          </div>
        </div>

        {/* Required technologies */}
        <div className="mb-6">
          <h4 className="text-white font-medium mb-1">Required Technologies</h4>
          <p className="text-xs text-neutral-500 mb-3">
            Skills a developer needs before joining.
          </p>
          {technologiesUsed.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Select the technologies this project uses first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {technologiesUsed.map((tech) => (
                <Pill
                  key={tech}
                  label={tech}
                  active={technologiesRequired.includes(tech)}
                  onClick={() => toggleRequired(tech)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Year range */}
        <div className="mb-6">
          <h4 className="text-white font-medium mb-3">Year Range</h4>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={yearMin}
              onChange={(event) => handleMinYearChange(Number(event.target.value))}
              className="bg-neutral-800 border border-neutral-700 text-white rounded-lg px-3 py-2 text-sm"
            >
              {YEAR_LABELS.map((label, index) => (
                <option key={label} value={index}>
                  {label}
                </option>
              ))}
            </select>
            <span className="text-neutral-500">to</span>
            <select
              value={yearMax}
              onChange={(event) => setYearMax(Number(event.target.value))}
              className="bg-neutral-800 border border-neutral-700 text-white rounded-lg px-3 py-2 text-sm"
            >
              {YEAR_LABELS.slice(yearMin).map((label, index) => (
                <option key={label} value={index + yearMin}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Transfer leadership */}
        <div className="mb-6 pt-6 border-t border-neutral-800">
          <h4 className="text-white font-medium mb-1">Transfer Leadership</h4>
          <p className="text-xs text-neutral-500 mb-3">
            Hand the Lead Developer role to another member of the team.
          </p>
          {otherMembers.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No other active developers with an Open Sourcery account are on
              this project yet.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={newLeadUid}
                onChange={(event) => setNewLeadUid(event.target.value)}
                className="bg-neutral-800 border border-neutral-700 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select a developer...</option>
                {otherMembers.map((member) => (
                  <option key={member.uid} value={member.uid}>
                    {member.firstName} {member.lastName}
                  </option>
                ))}
              </select>
              <button
                onClick={handleTransfer}
                disabled={!newLeadUid || transferring}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/90 text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {transferring ? 'Transferring...' : 'Transfer'}
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:opacity-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || technologiesUsed.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-ycs-pink text-black hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectSettingsModal;
