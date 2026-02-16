"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "@firebaseConfig";
import { createUserProfile, hashPassword } from "@lib/userService";
import { getGitHubUser, inviteUserToOrganization } from "@lib/githubService";
import { TECHNOLOGIES, TOPICS } from "@data";
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

const YEAR_OPTIONS = ["2025", "2026", "2027", "2028", "2029"];
const ALL_TECHNOLOGIES = TECHNOLOGIES.flatMap((g) => g.technologies);
const ALL_TOPICS = TOPICS.flatMap((g) => g.topics);

export default function SignUpPage() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
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
      const hashedPassword = await hashPassword(formData.password);

      const userData: User & { hashedPassword: string } = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        gitHubUsername: formData.gitHubUsername,
        discordUsername: formData.discordUsername,
        graduationYear: formData.graduationYear,
        technologiesExperiencedWith: formData.technologiesExperiencedWith,
        preferredTopics: formData.preferredTopics,
        currProject: "",
        eventsAttended: [],
        lastWarningTime: new Date(),
        hashedPassword,
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

      // Fire-and-forget org invite
      inviteUserToOrganization(formData.gitHubUsername).catch((err) =>
        console.error("Failed to send org invite:", err)
      );

      setCurrentPage(3);
      setTimeout(() => {
        router.push("/");
      }, 3000);
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
      <div className="w-full max-w-2xl flex flex-col">
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
              options={YEAR_OPTIONS}
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
          <div className="w-full flex justify-center px-4">
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
              <p className="text-sm text-gray-500">
                You&apos;ll be redirected to the home page in a moment.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
