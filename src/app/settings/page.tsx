"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@firebaseConfig";
import { useAuth } from "@context/AuthContext";
import { updateUserProfile, resendVerificationEmail } from "@lib/userService";
import { getGitHubUser } from "@lib/githubService";
import { leaveProject, withdrawProposal } from "@/lib/projectService";
import { useUserProjects } from "@hooks/useUserProjects";
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesWarning,
} from "@hooks/useUnsavedChangesWarning";
import { getGraduationYearOptions, Project, TECHNOLOGIES, TOPICS } from "@data";
import TextQuestion from "@components/forms/TextQuestion";
import MultipleChoiceQuestion from "@components/forms/MultipleChoiceQuestion";
import SelectMultipleQuestion from "@components/forms/SelectMultipleQuestion";
import SearchSelectQuestion from "@components/forms/SearchSelectQuestion";
import VerificationGate from "@components/VerificationGate";
import { User } from "@/types/users";

interface SettingsFormData {
  firstName: string;
  lastName: string;
  gitHubUsername: string;
  discordUsername: string;
  graduationYear: string;
  technologiesExperiencedWith: string[];
  preferredTopics: string[];
}

/**
 * The year choices, keeping whatever the user saved previously selectable
 * even once it falls outside the generated range - otherwise editing any
 * other setting would silently clear their graduation year.
 */
function graduationYearOptions(current: string): string[] {
  const options = getGraduationYearOptions();
  return current && !options.includes(current) ? [current, ...options] : options;
}
const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || "Open-Sourcery-UMD";
const ALL_TECHNOLOGIES = TECHNOLOGIES.flatMap((g) => g.technologies);
const ALL_TOPICS = TOPICS.flatMap((g) => g.topics).sort();

export default function SettingsPage() {
  const router = useRouter();

  const { firebaseUser, firestoreUser, setFirestoreUser, loading } = useAuth();
  const {
    projects: myProjects,
    pendingProjectIds,
    pendingProposals,
    loading: loadingProjects,
    incomplete: projectsIncomplete,
    refresh: refreshProjects,
  } = useUserProjects();

  const [formData, setFormData] = useState<SettingsFormData>({
    firstName: "",
    lastName: "",
    gitHubUsername: "",
    discordUsername: "",
    graduationYear: "",
    technologiesExperiencedWith: [],
    preferredTopics: [],
  });

  const [originalData, setOriginalData] =
    useState<SettingsFormData | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [leavingProjectId, setLeavingProjectId] = useState<string | null>(null);
  const [withdrawingProposalId, setWithdrawingProposalId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize form from AuthContext (single source of truth)
  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push("/sign-up");
      return;
    }

    if (firestoreUser) {
      const initialData: SettingsFormData = {
        firstName: firestoreUser.firstName || "",
        lastName: firestoreUser.lastName || "",
        gitHubUsername: firestoreUser.gitHubUsername || "",
        discordUsername: firestoreUser.discordUsername || "",
        graduationYear: firestoreUser.graduationYear || "",
        technologiesExperiencedWith:
          firestoreUser.technologiesExperiencedWith || [],
        preferredTopics: firestoreUser.preferredTopics || [],
      };

      setFormData(initialData);
      setOriginalData(initialData);
    }
  }, [firebaseUser, firestoreUser, loading, router]);

  const hasChanges = originalData
    ? formData.firstName !== originalData.firstName ||
      formData.lastName !== originalData.lastName ||
      formData.gitHubUsername !== originalData.gitHubUsername ||
      formData.discordUsername !== originalData.discordUsername ||
      formData.graduationYear !== originalData.graduationYear ||
      formData.technologiesExperiencedWith.join(",") !==
        originalData.technologiesExperiencedWith.join(",") ||
      formData.preferredTopics.join(",") !==
        originalData.preferredTopics.join(",")
    : false;

  // Covers the navbar, other in-app links, and closing or reloading the tab
  useUnsavedChangesWarning(hasChanges);

  const validateForm = (): boolean => {
    if (!formData.firstName.trim()) {
      setErrorMessage("First name is required.");
      return false;
    }
    if (!formData.lastName.trim()) {
      setErrorMessage("Last name is required.");
      return false;
    }
    if (!formData.gitHubUsername.trim()) {
      setErrorMessage("GitHub username is required.");
      return false;
    }
    if (!formData.discordUsername.trim()) {
      setErrorMessage("Discord username is required.");
      return false;
    }
    if (!formData.graduationYear) {
      setErrorMessage("Please select a graduation year.");
      return false;
    }
    if (formData.technologiesExperiencedWith.length === 0) {
      setErrorMessage("Please select at least one technology.");
      return false;
    }
    if (formData.preferredTopics.length === 0) {
      setErrorMessage("Please select at least one topic.");
      return false;
    }
    if (formData.preferredTopics.length > 20) {
      setErrorMessage("You can select a maximum of 20 topics.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!validateForm()) return;
    if (!firebaseUser) {
      setErrorMessage("User not authenticated.");
      return;
    }

    // Project membership follows the GitHub account, so a new username means
    // no longer counting as a member of the current project(s)
    const usernameChanged =
      originalData &&
      formData.gitHubUsername.trim().toLowerCase() !==
        originalData.gitHubUsername.trim().toLowerCase();

    if (usernameChanged && myProjects.length > 0) {
      const projectNames = myProjects.map((project) => `"${project.projectName}"`).join(", ");
      const confirmed = window.confirm(
        `Your project membership is tied to your GitHub account. After changing your ` +
          `GitHub username you will no longer count as a member of ${projectNames} ` +
          `unless the new account also has access to its repository. Continue?`
      );
      if (!confirmed) return;
    }

    setSubmitting(true);

    try {
      const updateData: Partial<User> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        gitHubUsername: formData.gitHubUsername,
        discordUsername: formData.discordUsername,
        graduationYear: formData.graduationYear,
        technologiesExperiencedWith:
          formData.technologiesExperiencedWith,
        preferredTopics: formData.preferredTopics,
      };

      await updateUserProfile(firebaseUser.uid, updateData);

      setFirestoreUser((prev) =>
        prev
          ? {
              ...prev,
              ...updateData,
            }
          : prev
      );

      setOriginalData(formData);

      setSuccessMessage("Changes saved successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save changes. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges && !window.confirm(UNSAVED_CHANGES_MESSAGE)) return;

    if (originalData) {
      setFormData(originalData);
      setErrorMessage("");
      setSuccessMessage("");
    }
    router.push("/");
  };

  const handleLeaveProject = async (project: Project) => {
    if (!firebaseUser?.uid) return;

    const confirmed = window.confirm(
      `Are you sure you want to leave "${project.projectName}"? ` +
        `This removes your access to its GitHub repository.`
    );
    if (!confirmed) return;

    setLeavingProjectId(project.id);
    setErrorMessage("");

    try {
      await leaveProject(project.id);

      // Membership comes from GitHub, so re-read it rather than assuming
      await refreshProjects({ fresh: true });

      const remaining = myProjects.filter((current) => current.id !== project.id);
      setSuccessMessage(`You have left "${project.projectName}".`);

      setTimeout(() => {
        setSuccessMessage("");
        // Stay put if there are other projects left to manage here, or if
        // navigating away would discard unsaved profile edits
        if (remaining.length === 0 && !hasChanges) {
          router.push("/");
        }
      }, 1000);
    } catch (error) {
      console.error("Error leaving project:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to leave project."
      );
    } finally {
      setLeavingProjectId(null);
    }
  };

  const handleWithdrawProposal = async (proposal: Project) => {
    const confirmed = window.confirm(
      `Withdraw your proposal for "${proposal.projectName}"? The board will be ` +
        `notified, and you'll be free to join an existing project instead.`
    );
    if (!confirmed) return;

    setWithdrawingProposalId(proposal.id);
    setErrorMessage("");

    try {
      await withdrawProposal(proposal.id);
      await refreshProjects();

      setSuccessMessage(`Your proposal for "${proposal.projectName}" has been withdrawn.`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error withdrawing proposal:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to withdraw proposal."
      );
    } finally {
      setWithdrawingProposalId(null);
    }
  };

  const handleSignOut = async () => {
    if (
      hasChanges &&
      !window.confirm("You have unsaved changes. Sign out without saving them?")
    ) {
      return;
    }

    try {
      await signOut(auth);
      setTimeout(() => router.push("/"), 10);
    } catch (error) {
      console.error("Error signing out:", error);
      setErrorMessage("Failed to sign out. Please try again.");
    }
  };

  const handleResendVerificationEmail = async () => {
    if (!firebaseUser) return;
    
    setResendingEmail(true);
    setResendMessage(null);
    try {
      await resendVerificationEmail(firebaseUser);
      setResendMessage({
        type: 'success',
        text: 'Verification email sent! Please check your inbox.',
      });
    } catch (error) {
      setResendMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to resend verification email',
      });
    } finally {
      setResendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center px-4 py-12">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!firebaseUser) return null;

  return (
    <VerificationGate>
      <div className="w-full flex justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">Account Settings</h1>
          <p className="text-gray-600">Manage your profile and team matching preferences</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg pointer-events-auto z-50">
            ✓ {successMessage}
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {errorMessage}
          </div>
        )}

        {/* Profile Information Section */}
        <div className="bg-white rounded-xl p-6 mb-8 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-semibold text-black mb-6">Profile Information</h2>

          {/* Email (Read-only) with Verification Status */}
          <div className="flex flex-col mb-6 text-black">
            <label className="relative text-m">
              <div className="flex items-center gap-2">
                <span>Email</span>
                <span className="text-gray-400 text-sm">(Read-only)</span>
                {firebaseUser?.emailVerified ? (
                  <span className="inline-flex items-center gap-1 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                    ✓ Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    ⚠ Pending Verification
                  </span>
                )}
              </div>
              <div className="mt-1 w-full p-2 rounded-xl border-2 border-gray-300 bg-gray-50 text-gray-600">
                {firestoreUser?.email || firebaseUser?.email || ""}
              </div>
            </label>

            {!firebaseUser?.emailVerified && (
              <div className="mt-4">
                {resendMessage && (
                  <div
                    className={`mb-3 p-3 rounded-lg text-sm ${
                      resendMessage.type === 'success'
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}
                  >
                    {resendMessage.text}
                  </div>
                )}
                <p className="text-sm text-gray-600 mb-3">
                  Didn't receive the verification email? <button
                    onClick={handleResendVerificationEmail}
                    disabled={resendingEmail}
                    className="text-ycs-blue hover:underline font-medium disabled:opacity-50"
                  >
                    {resendingEmail ? 'Sending...' : 'Click to resend'}
                  </button>
                </p>
              </div>
            )}
          </div>

          {/* First Name */}
          <TextQuestion
            question="First Name"
            placeholder="Enter your first name"
            maxLength={50}
            isRequired={true}
            value={formData.firstName}
            onChange={(value) => setFormData((prev) => ({ ...prev, firstName: value }))}
          />

          {/* Last Name */}
          <TextQuestion
            question="Last Name"
            placeholder="Enter your last name"
            maxLength={50}
            isRequired={true}
            value={formData.lastName}
            onChange={(value) => setFormData((prev) => ({ ...prev, lastName: value }))}
          />

          {/* GitHub Username */}
          <TextQuestion
            question="GitHub Username"
            placeholder="Enter your GitHub username"
            maxLength={39}
            isRequired={true}
            value={formData.gitHubUsername}
            onChange={(value) => setFormData((prev) => ({ ...prev, gitHubUsername: value }))}
            asyncValidators={[
              async (username: string) => {
                if (!username) return null;
                const exists = await getGitHubUser(username);
                return !exists ? "GitHub user not found. Please check your username." : null;
              },
            ]}
          />

          {/* Discord Username */}
          <TextQuestion
            question="Discord Username"
            placeholder="Enter your Discord username"
            maxLength={100}
            isRequired={true}
            value={formData.discordUsername}
            onChange={(value) => setFormData((prev) => ({ ...prev, discordUsername: value }))}
          />
        </div>

        {/* Team Matching Preferences Section */}
        <div className="bg-white rounded-xl p-6 mb-8 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-semibold text-black mb-6">Team Matching Preferences</h2>

          {/* Graduation Year */}
          <MultipleChoiceQuestion
            question="Graduation Year"
            options={graduationYearOptions(formData.graduationYear)}
            isRequired={true}
            value={formData.graduationYear}
            onChange={(value) => setFormData((prev) => ({ ...prev, graduationYear: value }))}
          />

          {/* Technologies */}
          <SelectMultipleQuestion
            question="Technologies You Have Experience In"
            options={ALL_TECHNOLOGIES}
            maxSelected={ALL_TECHNOLOGIES.length}
            isRequired={true}
            value={formData.technologiesExperiencedWith}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, technologiesExperiencedWith: value }))
            }
          />

          {/* Preferred Topics */}
          <SearchSelectQuestion
            question="Preferred Topics"
            placeholder="Search and add topics..."
            options={ALL_TOPICS}
            minSelected={1}
            maxSelected={20}
            value={formData.preferredTopics}
            onChange={(value) => setFormData((prev) => ({ ...prev, preferredTopics: value }))}
          />
        </div>

        {/* Current Project Section */}
        <div className="bg-white rounded-xl p-6 mb-8 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-semibold text-black mb-6">
            {myProjects.length > 1 ? "Current Projects" : "Current Project"}
          </h2>

          {!loadingProjects && pendingProposals.length > 0 && (
            <div className="space-y-5 mb-5">
              {pendingProposals.map((proposal) => (
                <div key={proposal.id} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-lg font-medium text-black">{proposal.projectName}</p>
                    <p className="text-sm text-gray-500">
                      Your proposal is awaiting review by the board. You can&apos;t join another
                      project while it&apos;s pending.
                    </p>
                  </div>
                  <button
                    onClick={() => handleWithdrawProposal(proposal)}
                    disabled={withdrawingProposalId !== null}
                    className="shrink-0 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
                  >
                    {withdrawingProposalId === proposal.id ? "Withdrawing..." : "Withdraw Proposal"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {loadingProjects ? (
            <p className="text-gray-500">Checking your project membership...</p>
          ) : myProjects.length > 0 ? (
            <div className="space-y-5">
              {myProjects.length > 1 && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  Your GitHub account has access to more than one project&apos;s repository, so
                  you&apos;re a member of each. You can only join one project through this site
                  &mdash; leave any you&apos;re no longer working on.
                </p>
              )}

              {myProjects.map((project) => {
                const pending = pendingProjectIds.has(project.id);

                return (
                  <div key={project.id} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-lg font-medium text-black">{project.projectName}</p>
                      <p className="text-sm text-gray-500">
                        {project.status === "ARCHIVED" ? (
                          "This project has been archived. You can leave it to join another."
                        ) : pending ? (
                          <>
                            Your invitation is pending &mdash;{" "}
                            <a
                              href={`https://github.com/${GITHUB_ORG}/${project.repositoryName}/invitations`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-ycs-blue underline"
                            >
                              accept it on GitHub
                            </a>{" "}
                            to start contributing.
                          </>
                        ) : (
                          "You are currently a member of this project."
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleLeaveProject(project)}
                      disabled={leavingProjectId !== null}
                      className="shrink-0 px-4 py-2 bg-red-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
                    >
                      {leavingProjectId === project.id ? "Leaving..." : "Leave Project"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : projectsIncomplete ? (
            <p className="text-gray-500">
              We couldn&apos;t check your project membership with GitHub right now. Please try again later.
            </p>
          ) : pendingProposals.length === 0 ? (
            <p className="text-gray-500">No current project. Visit the Team Matching Portal to join one.</p>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-between mb-8">
          <button
            onClick={handleSignOut}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            Sign Out
          </button>
          <div className="flex gap-4">
            <button
              onClick={handleCancel}
              disabled={submitting}
              className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !hasChanges}
              className="px-6 py-2 bg-ycs-blue text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
    </VerificationGate>
  );
}
