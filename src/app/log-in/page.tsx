"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
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

  return (
    <div className="w-full flex justify-center px-4 py-12">
      <div className="w-full max-w-2xl flex flex-col">
        <FormHeader
          title="Log In to Your Account"
          confirmationPage={false}
          currPage={0}
          pageCount={1}
          sectionLabels={[]}
        />

        <FormSection
          onBack={() => router.push("/")}
          onNext={handleSubmit}
          submitText={loading ? "Logging in..." : "Log In"}
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
            placeholder="Enter your password"
            maxLength={100}
            isRequired={true}
            value={formData.password}
            onChange={(value) => setFormData((prev) => ({ ...prev, password: value }))}
            type="password"
          />

          <div className="flex flex-col mb-10 text-black">
            <p className="text-sm text-gray-600 mb-4">
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

