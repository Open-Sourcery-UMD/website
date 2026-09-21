"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@firebaseConfig";
import FormHeader from "@components/forms/FormHeader";
import FormSection from "@components/forms/FormSection";
import TextQuestion from "@components/forms/TextQuestion";

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  // The same page doubles as "forgot password": just the email, and a link
  const [resetMode, setResetMode] = useState(false);
  const [resetSentTo, setResetSentTo] = useState("");

  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
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
    return true;
  };

  const handleSubmit = async () => {
    setErrorMessage("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      router.push("/");
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === "auth/user-not-found") {
        setErrorMessage("No account found with this email. Please sign up first.");
      } else if (error.code === "auth/wrong-password") {
        setErrorMessage("Incorrect password.");
      } else if (error.code === "auth/invalid-credential") {
        setErrorMessage("Invalid email or password.");
      } else {
        setErrorMessage(error.message || "An error occurred. Please try again.");
      }
      setLoading(false);
    }
  };

  const handleSignUpLink = () => {
    router.push("/sign-up");
  };

  const showResetForm = (show: boolean) => {
    setResetMode(show);
    setResetSentTo("");
    setErrorMessage("");
  };

  const handleSendReset = async () => {
    setErrorMessage("");

    const email = formData.email.trim();
    if (!email) {
      setErrorMessage("Enter the email address you signed up with.");
      return;
    }
    if (!validateEmail(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setResetSentTo(email);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        // Answer exactly as for a real account, so this form can't be used
        // to find out who has one
        setResetSentTo(email);
      } else if (error.code === "auth/too-many-requests") {
        setErrorMessage("Too many requests. Please wait a few minutes and try again.");
      } else {
        console.error("Password reset error:", error);
        setErrorMessage("We couldn't send a reset link. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (resetMode) {
    return (
      <div className="w-full flex justify-center px-4 py-12">
        <div className="w-full max-w-md flex flex-col">
          <FormHeader
            title="Reset Your Password"
            confirmationPage={false}
            currPage={0}
            pageCount={1}
            sectionLabels={[]}
            compact
          />

          <FormSection
            onBack={() => showResetForm(false)}
            onNext={handleSendReset}
            submitText={loading ? "Sending..." : resetSentTo ? "Send Again" : "Send Reset Link"}
            errorMessage={errorMessage}
            compact
          >
            <p className="text-sm text-gray-600 mb-4">
              Enter the email address you signed up with and we&apos;ll send you a link to choose
              a new password.
            </p>

            <TextQuestion
              question="Email"
              placeholder="Enter your email"
              maxLength={100}
              isRequired={true}
              value={formData.email}
              onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))}
              type="email"
              compact
            />

            {resetSentTo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-blue-800 font-medium">Check your email</p>
                <p className="text-blue-600 text-sm mt-1">
                  If there&apos;s an account for {resetSentTo}, we&apos;ve sent it a link to reset
                  your password. If you can&apos;t find the email, please check your spam.
                </p>
              </div>
            )}

            <p className="text-sm text-gray-600">
              Remembered it?{" "}
              <button
                type="button"
                onClick={() => showResetForm(false)}
                className="text-ycs-blue hover:underline font-medium"
              >
                Back to log in
              </button>
            </p>
          </FormSection>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center px-4 py-12">
      <div className="w-full max-w-md flex flex-col">
        <FormHeader
          title="Log In to Your Account"
          confirmationPage={false}
          currPage={0}
          pageCount={1}
          sectionLabels={[]}
          compact
        />

        <FormSection
          onBack={() => router.push("/")}
          onNext={handleSubmit}
          submitText={loading ? "Logging in..." : "Log In"}
          errorMessage={errorMessage}
          compact
        >
          <TextQuestion
            question="Email"
            placeholder="Enter your email"
            maxLength={100}
            isRequired={true}
            value={formData.email}
            onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))}
            type="email"
              compact
          />

          <TextQuestion
            question="Password"
            placeholder="Enter your password"
            maxLength={100}
            isRequired={true}
            value={formData.password}
            onChange={(value) => setFormData((prev) => ({ ...prev, password: value }))}
            type="password"
              compact
          />

          <div className="flex flex-col gap-1 text-black">
            <p className="text-sm text-gray-600">
              <button
                type="button"
                onClick={() => showResetForm(true)}
                className="text-ycs-blue hover:underline font-medium"
              >
                Forgot your password?
              </button>
            </p>
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <button
                onClick={handleSignUpLink}
                className="text-ycs-blue hover:underline font-medium"
              >
                Sign up here
              </button>
            </p>
          </div>
        </FormSection>
      </div>
    </div>
  );
}

