'use client';

import { useState } from 'react';
import { useAuth } from '@context/AuthContext';
import { useRouter } from 'next/navigation';
import { resendVerificationEmail } from '@lib/userService';

interface VerificationGateProps {
  children: React.ReactNode;
}

export default function VerificationGate({ children }: VerificationGateProps) {
  const { firebaseUser, emailVerified, loading } = useAuth();
  const router = useRouter();
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!firebaseUser) {
    // Not authenticated - redirect to login
    router.push('/log-in');
    return null;
  }

  if (!emailVerified) {
    // Email not verified - show gate
    const handleResendEmail = async () => {
      setResendLoading(true);
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
        setResendLoading(false);
      }
    };

    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-center mb-6">
            <div className="text-5xl">✉️</div>
          </div>
          <h2 className="text-2xl font-bold text-black text-center mb-3">Email Verification Required</h2>
          <p className="text-gray-600 text-center mb-6">
            Please verify your email address to access this feature.
          </p>
          <p className="text-sm text-gray-500 text-center mb-6">
            We sent a verification link to <strong className="text-gray-700">{firebaseUser?.email}</strong>. 
            Click the link in your email to verify your account. If you cannot locate the email, please check your spam.
          </p>

          {resendMessage && (
            <div
              className={`mb-6 p-3 rounded-lg text-sm ${
                resendMessage.type === 'success'
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {resendMessage.text}
            </div>
          )}

          <button
            onClick={handleResendEmail}
            disabled={resendLoading}
            className="w-full bg-ycs-blue hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition mb-4"
          >
            {resendLoading ? 'Sending...' : 'Resend Verification Email'}
          </button>

          <button
            onClick={() => router.push('/log-in')}
            className="w-full text-gray-600 hover:text-gray-900 font-medium py-2 px-4 border border-gray-300 rounded-lg transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Email verified - render children
  return <>{children}</>;
}
