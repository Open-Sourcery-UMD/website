'use client';

import { auth } from '@/firebaseConfig';

/**
 * fetch() that sends the signed-in user's Firebase ID token, so API routes can
 * verify who is calling.
 *
 * Waits for Firebase to finish restoring the session first - otherwise a call
 * made right after page load would go out anonymously.
 */
export async function authorizedFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  await auth.authStateReady();

  const headers = new Headers(init.headers);
  const user = auth.currentUser;
  if (user) {
    headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  }

  return fetch(input, { ...init, headers });
}

/**
 * POSTs JSON as the signed-in user, throwing the server's message on failure
 * so it can be shown as-is.
 */
export async function postAuthorized(url: string, body: unknown): Promise<void> {
  const response = await authorizedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
}
