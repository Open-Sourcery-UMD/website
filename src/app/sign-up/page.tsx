"use client";

import Link from "next/link";
import { useState } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "@firebaseConfig";
import { checkDiscordMembership, createUserProfile } from "@lib/userService";
import type { DiscordInviteStatus } from "@/lib/server/discordSync";
import { FaDiscord } from "react-icons/fa";
import { getGitHubUser, inviteUserToOrganization } from "@lib/githubService";
import { checkDiscordUsername, DISCORD_NOT_FOUND_HINT } from "@lib/discordService";
import { TECHNOLOGIES, TOPICS, getGraduationYearOptions } from "@data";
import FormHeader from "@components/forms/FormHeader";
import FormSection from "@components/forms/FormSection";
import TextQuestion from "@components/forms/TextQuestion";
import MultipleChoiceQuestion from "@components/forms/MultipleChoiceQuestion";
import SelectMultipleQuestion from "@components/forms/SelectMultipleQuestion";
import SearchSelectQuestion from "@components/forms/SearchSelectQuestion";
import { User } from "@/types/users";
import { useTeamMatching } from "@context/TeamMatchingContext";

interface SignUpFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  gitHubUsername: string;
  discordUsername: string;
  graduationYear: string;
  technologiesExperiencedWith: string[];
  preferredTopics: string[];
}

const ALL_TECHNOLOGIES = TECHNOLOGIES.flatMap((g) => g.technologies);
const ALL_TOPICS = TOPICS.flatMap((g) => g.topics);

export default function SignUpPage() {
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  // Filled in after sign-up; shows a Discord invite if they aren't in the server
  const [discordInvite, setDiscordInvite] = useState<DiscordInviteStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState<SignUpFormData>({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    gitHubUsername: "",
    discordUsername: "",
    graduationYear: "",
    technologiesExperiencedWith: [],
    preferredTopics: [],
  });

  const { setData } = useTeamMatching();

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePage1 = (): boolean => {
    if (!formData.email.trim()) {
      setErrorMessage("Email is required.");
      return false;
    }
    if (!validateEmail(formData.email)) {
      setErrorMessage("Please enter a valid email address.");
      return false;
    }
    if (!formData.password) {
      setErrorMessage("Password is required.");
      return false;
    }
    if (formData.password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return false;
    }
    if (!formData.confirmPassword) {
      setErrorMessage("Please confirm your password.");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return false;
    }
    return true;
  };

  const validatePage2 = (): boolean => {
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
    return true;
  };

  const validatePage3 = (): boolean => {
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

  const handleNextPage = () => {
    setErrorMessage("");
    let isValid = false;

    if (currentPage === 0) isValid = validatePage1();
    else if (currentPage === 1) isValid = validatePage2();
    else if (currentPage === 2) isValid = validatePage3();

    if (isValid) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    setCurrentPage(currentPage - 1);
    setErrorMessage("");
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      // Saved exactly as Discord spells it when they're in the server, so the
      // bot can match them; otherwise as typed
      const discordCheck = await checkDiscordUsername(formData.discordUsername);
      const discordUsername =
        (discordCheck.inServer && discordCheck.username) || formData.discordUsername;

      // No password is stored here: Firebase Auth owns credentials, and a copy
      // of the hash in the profile only created something to leak
      const userData: User = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        gitHubUsername: formData.gitHubUsername,
        discordUsername,
        graduationYear: formData.graduationYear,
        technologiesExperiencedWith: formData.technologiesExperiencedWith,
        preferredTopics: formData.preferredTopics,
        eventsAttended: [],
        lastWarningTime: new Date(),
      };

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      await createUserProfile(userCredential.user.uid, userData);

      setData({
        year: formData.graduationYear,
        technologies: formData.technologiesExperiencedWith,
        topics: formData.preferredTopics,
      });

      // Send email verification
      await sendEmailVerification(userCredential.user);

      // Fire-and-forget org invite. The server invites the GitHub account on
      // the profile just created, identified by the new user's session.
      inviteUserToOrganization().catch((err) =>
        console.error("Failed to send org invite:", err)
      );

      // Also fire-and-forget: the server emails a Discord invite if they
      // aren't in the server yet, and the link shows on the confirmation
      checkDiscordMembership()
        .then(setDiscordInvite)
        .catch((err) => console.error("Failed to check Discord membership:", err));

      // Stay on the confirmation so they can read the note about checking spam;
      // they leave when they're ready
      setCurrentPage(3);
    } catch (error: any) {
      console.error("Sign-up error:", error);
      if (error.code === "auth/email-already-in-use") {
        setErrorMessage("Email is already in use. Please use a different email.");
      } else {
        setErrorMessage(error.message || "An error occurred. Please try again.");
      }
      setLoading(false);
    }
  };

  const sectionLabels = ["Sign In", "Profile", "Preferences", "Confirmation"];

  return (
    <div className="w-full flex justify-center px-4 py-12">
      <div className="y2k-frame mt-8 w-full max-w-2xl flex flex-col">
        <FormHeader
          title="Create Your Account"
          confirmationPage={currentPage === 3}
          currPage={currentPage}
          pageCount={4}
          sectionLabels={sectionLabels}
        />

        {/* Page 1: Authentication */}
        {currentPage === 0 && (
          <FormSection
            onBack={() => {}}
            onNext={handleNextPage}
            submitText="Next"
            errorMessage={errorMessage}
          >
            <TextQuestion
              question="Email"
              placeholder="Enter your email"
              maxLength={100}
              isRequired={true}
              value={formData.email}
              onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))}
              type="email"
            />

            <TextQuestion
              question="Password"
              placeholder="Enter a password (min 8 characters)"
              maxLength={100}
              isRequired={true}
              value={formData.password}
              onChange={(value) => setFormData((prev) => ({ ...prev, password: value }))}
              type="password"
            />

            <TextQuestion
              question="Confirm Password"
              placeholder="Re-enter your password"
              maxLength={100}
              isRequired={true}
              value={formData.confirmPassword}
              onChange={(value) => setFormData((prev) => ({ ...prev, confirmPassword: value }))}
              type="password"
            />
          </FormSection>
        )}

        {/* Page 2: Profile */}
        {currentPage === 1 && (
          <FormSection
            onBack={handlePreviousPage}
            onNext={handleNextPage}
            submitText="Next"
            errorMessage={errorMessage}
          >
            <TextQuestion
              question="First Name"
              placeholder="Enter your first name"
              maxLength={50}
              isRequired={true}
              value={formData.firstName}
              onChange={(value) => setFormData((prev) => ({ ...prev, firstName: value }))}
            />

            <TextQuestion
              question="Last Name"
              placeholder="Enter your last name"
              maxLength={50}
              isRequired={true}
              value={formData.lastName}
              onChange={(value) => setFormData((prev) => ({ ...prev, lastName: value }))}
            />

            <TextQuestion
              question="GitHub Username (MAKE SURE THIS IS ACCURATE, as we'll use it to send you organization/repository invites)"
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

            <TextQuestion
              question="Discord Username"
              placeholder="Enter your Discord username"
              maxLength={100}
              isRequired={true}
              value={formData.discordUsername}
              onChange={(value) => setFormData((prev) => ({ ...prev, discordUsername: value }))}
              // Advice, not a requirement: many people join the server after signing up
              asyncHint={async (username: string) => {
                const result = await checkDiscordUsername(username);
                if (!result.checked || result.inServer) return null;
                return (
                  <>
                    We couldn&apos;t find this username in the Open Sourcery Discord server.{" "}
                    {DISCORD_NOT_FOUND_HINT} Haven&apos;t joined yet?{" "}
                    <a href={result.inviteUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                      Join the server
                    </a>
                    , then you can continue.
                  </>
                );
              }}
            />
          </FormSection>
        )}

        {/* Page 3: Preferences */}
        {currentPage === 2 && (
          <FormSection
            onBack={handlePreviousPage}
            onNext={handleSubmit}
            submitText={loading ? "Creating Account..." : "Complete Sign-up"}
            errorMessage={errorMessage}
          >
            <MultipleChoiceQuestion
              question="Graduation Year"
              options={getGraduationYearOptions()}
              isRequired={true}
              value={formData.graduationYear}
              onChange={(value) => setFormData((prev) => ({ ...prev, graduationYear: value }))}
            />

            <SelectMultipleQuestion
              question="Technologies You Have Experience In"
              options={ALL_TECHNOLOGIES}
              maxSelected={ALL_TECHNOLOGIES.length}
              isRequired={true}
              value={formData.technologiesExperiencedWith}
              onChange={(value) => setFormData((prev) => ({ ...prev, technologiesExperiencedWith: value }))}
            />

            <SearchSelectQuestion
              question="Preferred Topics"
              placeholder="Search and add topics..."
              options={ALL_TOPICS}
              minSelected={1}
              maxSelected={20}
              value={formData.preferredTopics}
              onChange={(value) => setFormData((prev) => ({ ...prev, preferredTopics: value }))}
            />
          </FormSection>
        )}

        {/* Page 4: Confirmation */}
        {currentPage === 3 && (
          <div className="w-full flex justify-center">
            <div className="w-full max-w-2xl bg-white rounded-br-2xl rounded-bl-2xl shadow-[0_0_10px_0_white] p-10 text-center">
              <h2 className="text-3xl font-semibold text-ycs-blue mb-4">
                Welcome, {formData.firstName}!
              </h2>
              <p className="text-gray-700 mb-4">
                Your account has been successfully created.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-800 font-medium">
                  Please verify your email address
                </p>
                <p className="text-blue-600 text-sm mt-1">
                  We sent a verification link to {formData.email}.
                  Please check your inbox and click the link to verify your account. If you cannot locate the email, please check your spam.
                </p>
              </div>
              {discordInvite && discordInvite.inServer !== true && (
                <div className="bg-[#5865f2]/10 border border-[#5865f2]/30 rounded-lg p-4 mb-6">
                  <p className="text-[#3c45a5] font-medium">Join our Discord</p>
                  <p className="text-[#4752c4] text-sm mt-1 mb-3">
                    Project channels, questions and announcements all happen there. Once you&apos;re
                    in, you&apos;ll be added to your project&apos;s channel when you join one.
                  </p>
                  <a
                    href={discordInvite.inviteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#5865f2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4752c4] transition-colors"
                  >
                    <FaDiscord aria-hidden size={16} />
                    Join the server
                  </a>
                </div>
              )}
              <Link
                href="/"
                className="y2k-button inline-flex px-8 py-3 font-semibold text-white"
              >
                Go to the home page
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
