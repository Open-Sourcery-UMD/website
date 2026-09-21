import { adminAuth } from "./firebaseAdmin";
import { HttpError } from "./httpErrors";

function getBearerToken(request: Request): string | null {
  const match = (request.headers.get("authorization") || "").match(
    /^Bearer\s+(.+)$/i
  );
  return match ? match[1] : null;
}

/**
 * Verifies the caller's Firebase ID token and returns their uid.
 *
 * Revocation is checked too, so a disabled or deleted account can't keep
 * acting with a token it was issued earlier.
 */
export async function requireUser(request: Request): Promise<string> {
  const token = getBearerToken(request);
  if (!token) {
    throw new HttpError(401, "You need to be signed in to do that.");
  }

  // Resolved outside the try so a missing server credential surfaces as a
  // 500, not as a misleading "signed out"
  const auth = adminAuth();

  try {
    const decoded = await auth.verifyIdToken(token, true);
    return decoded.uid;
  } catch {
    throw new HttpError(401, "Your session has expired. Please sign in again.");
  }
}

/**
 * Like requireUser, but returns null instead of throwing, for endpoints that
 * are public yet grant signed-in callers a little more (e.g. skipping a cache).
 */
export async function getOptionalUser(request: Request): Promise<string | null> {
  const token = getBearerToken(request);
  if (!token) return null;

  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}
