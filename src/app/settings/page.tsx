"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@firebaseConfig";
import { useAuth } from "@context/AuthContext";
import { updateUserProfile } from "@lib/userService";
import { getGitHubUser } from "@lib/githubService";
import { leaveProjectByName } from "@/lib/projectService";
import { TECHNOLOGIES, TOPICS } from "@data";
import TextQuestion from "@components/forms/TextQuestion";
import MultipleChoiceQuestion from "@components/forms/MultipleChoiceQuestion";
import SelectMultipleQuestion from "@components/forms/SelectMultipleQuestion";
import SearchSelectQuestion from "@components/forms/SearchSelectQuestion";
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

const YEAR_OPTIONS = ["2025", "2026", "2027", "2028", "2029"];
const ALL_TECHNOLOGIES = TECHNOLOGIES.flatMap((g) => g.technologies);
const ALL_TOPICS = TOPICS.flatMap((g) => g.topics).sort();

export default function SettingsPage() {
  const router = useRouter();

  const { firebaseUser, firestoreUser, setFirestoreUser, loading } = useAuth();

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
  const [leavingProject, setLeavingProject] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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
    if (originalData) {
      setFormData(originalData);
      setErrorMessage("");
      setSuccessMessage("");
    }
  };

  const handleLeaveProject = async () => {
    if (!firebaseUser?.uid || !firestoreUser?.currProject) return;

    const confirmed = window.confirm(
      `Are you sure you want to leave "${firestoreUser.currProject}"?`
    );
    if (!confirmed) return;

    setLeavingProject(true);
    setErrorMessage("");

    try {
      await leaveProjectByName(
        firebaseUser.uid,
        firestoreUser.currProject
      );

      setFirestoreUser((prev) =>
        prev ? { ...prev, currProject: "" } : prev
      );

      setSuccessMessage("You have left the project.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error leaving project:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to leave project."
      );
    } finally {
      setLeavingProject(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
      setErrorMessage("Failed to sign out. Please try again.");
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

          {/* Email (Read-only) */}
          <div className="flex flex-col mb-6 text-black">
            <label className="relative text-m">
              <div className="flex">
                <span>Email</span>
                <span className="text-gray-400 text-sm ml-2">(Read-only)</span>
              </div>
              <div className="mt-1 w-full p-2 rounded-xl border-2 border-gray-300 bg-gray-50 text-gray-600">
                {firestoreUser?.email || firebaseUser?.email || ""}
              </div>
            </label>
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
            options={YEAR_OPTIONS}
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
          <h2 className="text-2xl font-semibold text-black mb-6">Current Project</h2>

          {firestoreUser?.currProject ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-medium text-black">{firestoreUser.currProject}</p>
                <p className="text-sm text-gray-500">You are currently a member of this project.</p>
              </div>
              <button
                onClick={handleLeaveProject}
                disabled={leavingProject}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
              >
                {leavingProject ? "Leaving..." : "Leave Project"}
              </button>
            </div>
          ) : (
            <p className="text-gray-500">No current project. Visit the Team Matching Portal to join one.</p>
          )}
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
              disabled={submitting}
              className="px-6 py-2 bg-ycs-blue text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
