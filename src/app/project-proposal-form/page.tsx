'use client';

import { useState, useMemo, useEffect } from 'react';
import { TECHNOLOGIES, TOPICS } from '@data';
import { useAuth } from '@context/AuthContext';
import { useRouter } from 'next/navigation';
import FormHeader from '@components/forms/FormHeader';
import FormSection from '@components/forms/FormSection';
import TextQuestion from '@components/forms/TextQuestion';
import TextareaQuestion from '@components/forms/TextareaQuestion';
import SliderQuestion from '@components/forms/SliderQuestion';
import SelectMultipleQuestion from '@components/forms/SelectMultipleQuestion';
import SearchSelectQuestion from '@components/forms/SearchSelectQuestion';
import { createProjectProposal } from '@/lib/projectService';
import MultipleChoiceQuestion from '@components/forms/MultipleChoiceQuestion';
import VerificationGate from '@components/VerificationGate';

const YEAR_LABELS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Grad Student'];
const TOPICS_MAX = 20;
const GITHUB_REPO_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const formatYearRange = (min: number, max: number) => {
  if (min === max) {
    return YEAR_LABELS[min] === 'Freshman'
      ? 'Freshmen Only'
      : `${YEAR_LABELS[min]}s Only`;
  }
  return `${YEAR_LABELS[min]} – ${YEAR_LABELS[max]}`;
};

const PAGE_COUNT = 4;
const SECTION_LABELS = ['Project Info', 'Team Settings', 'Technologies & Topics', 'Confirmation'];

const ProjectProposalPage = () => {
  const router = useRouter();
  const { firebaseUser, firestoreUser, loading } = useAuth();

  const [currentPage, setCurrentPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [yearMin, setYearMin] = useState(0);
  const [yearMax, setYearMax] = useState(4);
  const [technologiesUsed, setTechnologiesUsed] = useState<string[]>([]);
  const [technologiesRequired, setTechnologiesRequired] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [maxTeamSize, setMaxTeamSize] = useState(6);

  const minYearOptions = YEAR_LABELS;
  const maxYearOptions = YEAR_LABELS.slice(yearMin);

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/log-in');
    }
  }, [loading, firebaseUser, router]);

  const allTechnologies = useMemo(
    () => TECHNOLOGIES.flatMap((group) => group.technologies),
    []
  );

  const allTopics = useMemo(
    () => TOPICS.flatMap((group) => group.topics).sort((a, b) => a.localeCompare(b)),
    []
  );

  if (loading || !firebaseUser || !firestoreUser) {
    return null;
  }

  if (firestoreUser.currProject !== '') {
    return (
      <div className="flex flex-col items-center text-center justify-center px-60">
        <h1 className='mt-20 text-2xl'>
          You're already on the '{firestoreUser.currProject}' project.
        </h1>
        <h2 className='mb-40 text-gray-300'>
          You can only be a Developer on one project at a time.
        </h2>
      </div>
    )
  }

  const validatePage0 = (): boolean => {
    if (!projectName.trim()) {
      setErrorMessage('Project name is required.');
      return false;
    }
    if (!GITHUB_REPO_REGEX.test(projectName)) {
      setErrorMessage('Must be a valid GitHub repository name (lowercase letters, numbers, and hyphens only).');
      return false;
    }
    if (description.length < 10) {
      setErrorMessage('Description must be at least 10 characters.');
      return false;
    }
    return true;
  };

  const validatePage1 = (): boolean => {
    if (yearMin > yearMax) {
      setErrorMessage('Minimum year cannot be greater than maximum year.');
      return false;
    }
    return true;
  };

  const validatePage2 = (): boolean => {
    if (technologiesUsed.length === 0) {
      setErrorMessage('Select at least one technology used.');
      return false;
    }
    if (technologiesRequired.length === 0) {
      setErrorMessage('Select at least one required technology.');
      return false;
    }
    if (topics.length === 0) {
      setErrorMessage('Select at least one topic.');
      return false;
    }
    return true;
  };

  const handleNextPage = () => {
    setErrorMessage('');
    let isValid = false;

    if (currentPage === 1) isValid = validatePage0();
    else if (currentPage === 2) isValid = validatePage1();
    else if (currentPage === 3) isValid = validatePage2();

    if (isValid) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    setCurrentPage(currentPage - 1);
    setErrorMessage('');
  };

  const handleSubmit = async () => {
    if (!validatePage2()) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (loading || !firebaseUser || !firebaseUser.email || !firestoreUser) {
        return;
      }

      await fetch("/api/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipients: ["Open Sourcery <umdopensourcery@gmail.com>"],
          subject: `[ACTION REQUIRED] A new project proposal has been submitted: ${projectName}`,
          message: `
          Dear Open Sourcery Team,

          The following project proposal was submitted via the Open Sourcery Website on ${new Date().toLocaleString()} by ${firestoreUser.firstName} ${firestoreUser.lastName} (${firebaseUser.email}):

          Project Name: ${projectName}
          Description: ${description}
          Year Range: ${formatYearRange(yearMin, yearMax)}
          Technologies Used: ${technologiesUsed}
          Technologies Required: ${technologiesRequired}
          Topics: ${topics}
          Max. Team Size: ${maxTeamSize}

          If this project seems reasonable, please complete the following steps:
            1. Create a GitHub repository under the UMD Open Sourcery GitHub organization with the provided project name, description, and topics, and the Apache-2.0 license.
            2. Ensure @${firestoreUser.gitHubUsername} has been granted write access to the UMD Open Sourcery GitHub organization, and grant them admin access to their new repository.
            3. Email ${firebaseUser.email} to inform them that their project's repository has been created, and to schedule an onboarding meeting.
            4. Update @${firestoreUser.discordUsername}'s Discord roles to include "Lead Developer" and "Developer".
            5. Send a message in the #team-matching Discord channel that @${firestoreUser.discordUsername} has started the '${projectName}' project.
               Ex: 🚨 NEW PROJECT ALERT 🚨
                   @${firestoreUser.discordUsername} has started the '${projectName}' project!

          Happy hacking!
          `,
        }),
      });

      await createProjectProposal(firebaseUser.uid, {
        projectName,
        description,
        yearRange: [yearMin, yearMax],
        technologiesUsed,
        technologiesRequired,
        topics,
        maxTeamSize,
      });

      setCurrentPage(4);
    } catch (err) {
      console.error('Error submitting proposal:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <VerificationGate>
      <div className="w-full flex justify-center px-4 py-12">
        <div className="w-full max-w-2xl flex flex-col">
          <FormHeader
            title="Project Proposal"
            confirmationPage={currentPage === 4}
            currPage={currentPage}
            pageCount={PAGE_COUNT}
            sectionLabels={SECTION_LABELS}
          />

        {/* Page 1: Project Info */}
        {currentPage === 1 && (
          <FormSection
            onBack={() => {}}
            onNext={handleNextPage}
            submitText="Next"
            errorMessage={errorMessage}
          >
            <TextQuestion
              question="Project (Repository) Name"
              placeholder="my-awesome-project"
              maxLength={100}
              isRequired={true}
              value={projectName}
              onChange={setProjectName}
              validators={[
                (val) =>
                  !GITHUB_REPO_REGEX.test(val) && val.length > 0
                    ? 'Must be a valid GitHub repository name (lowercase, hyphens only)'
                    : '',
              ]}
            />

            <TextareaQuestion
              question="Description"
              placeholder="Describe your project..."
              maxLength={500}
              minLength={10}
              rows={4}
              isRequired={true}
              value={description}
              onChange={setDescription}
            />
          </FormSection>
        )}

        {/* Page 2: Team Settings */}
        {currentPage === 2 && (
          <FormSection
            onBack={handlePreviousPage}
            onNext={handleNextPage}
            submitText="Next"
            errorMessage={errorMessage}
          >
            <MultipleChoiceQuestion
              question="Minimum Year"
              options={minYearOptions}
              isRequired={true}
              value={YEAR_LABELS[yearMin]}
              onChange={(val) => {
                const newMin = YEAR_LABELS.indexOf(val);
                setYearMin(newMin);

                // Ensure max never drops below new min
                if (yearMax < newMin) {
                  setYearMax(newMin);
                }
              }}
            />

            <MultipleChoiceQuestion
              question="Maximum Year"
              options={maxYearOptions}
              isRequired={true}
              value={YEAR_LABELS[yearMax]}
              onChange={(val) => {
                const newMax = YEAR_LABELS.indexOf(val);
                setYearMax(newMax);
              }}
            />

            <div className="text-center mt-[-2rem] mb-8">
              <p className="text-blue-600 font-semibold text-lg">
                {formatYearRange(yearMin, yearMax)}
              </p>
            </div>

            <SliderQuestion
              question="Maximum Team Size"
              minimum={1}
              maximum={12}
              value={maxTeamSize}
              onChange={setMaxTeamSize}
            />
            <p className="text-gray-500 text-sm -mt-8 mb-4">
              Including the project lead (you).
            </p>
          </FormSection>
        )}

        {/* Page 3: Technologies & Topics */}
        {currentPage === 3 && (
          <FormSection
            onBack={handlePreviousPage}
            onNext={handleSubmit}
            submitText={isSubmitting ? 'Submitting...' : 'Submit Proposal'}
            errorMessage={errorMessage}
          >
            <SelectMultipleQuestion
              question="Technologies Used"
              options={allTechnologies}
              maxSelected={allTechnologies.length}
              isRequired={true}
              value={technologiesUsed}
              onChange={setTechnologiesUsed}
            />
            <p className="text-gray-500 text-sm -mt-8 mb-8">
              Select all technologies that will be used in this project.
            </p>

            <SelectMultipleQuestion
              question="Technologies Required"
              options={technologiesUsed.length > 0 ? technologiesUsed : allTechnologies}
              maxSelected={technologiesUsed.length > 0 ? technologiesUsed.length : allTechnologies.length}
              isRequired={technologiesUsed.length > 0}
              value={technologiesRequired}
              onChange={setTechnologiesRequired}
            />
            <p className="text-gray-500 text-sm -mt-8 mb-8">
              Technologies contributors are expected to already know.
            </p>

            <SearchSelectQuestion
              question="Topics"
              placeholder="Search topics..."
              options={allTopics}
              minSelected={1}
              maxSelected={TOPICS_MAX}
              value={topics}
              onChange={setTopics}
            />
            <p className="text-gray-500 text-sm -mt-8 mb-4">
              Topics help others discover your project.
            </p>
          </FormSection>
        )}

        {/* Page 4: Confirmation */}
        {currentPage === 4 && (
          <div className="w-full flex justify-center px-4">
            <div className="w-full max-w-2xl bg-white rounded-br-2xl rounded-bl-2xl shadow-[0_0_10px_0_white] p-10 text-center">
              <h2 className="text-3xl font-semibold text-ycs-blue mb-4">
                Proposal Submitted!
              </h2>
              <p className="text-gray-700 mb-6">
                Your project &quot;{projectName}&quot; has been submitted for review.
                You will receive an email when it is approved and a repository is created.
              </p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors duration-200"
              >
                Return Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </VerificationGate>
  );
};

export default ProjectProposalPage;
