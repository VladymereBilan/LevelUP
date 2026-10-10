import { supabase } from "./supabase";
import { signOut } from "./auth";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    "Missing EXPO_PUBLIC_API_URL. Set it in apps/mobile/.env.local (gitignored) — see apps/mobile/README.md.",
  );
}

const DEFAULT_TIMEOUT_MS = 15000;

export type ApiErrorKind = "network" | "timeout" | "rate_limited" | "session_expired" | "http";

/** A failed API call. `kind` lets callers branch without parsing `message`. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;

  constructor(kind: ApiErrorKind, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  timeoutMs?: number;
}

function isErrorBody(body: unknown): body is { error: string } {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as Record<string, unknown>).error === "string"
  );
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Returns the new access token on success, or null if the session couldn't be refreshed. */
async function refreshAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session) return null;
  return data.session.access_token;
}

async function send(
  path: string,
  token: string | null,
  options: RequestOptions,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    return await fetch(`${API_URL}${path}`, {
      method: options.method ?? "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : null,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Calls a LevelUP API route (see apps/web/app/api), attaching the current
 * Supabase session's access token as a Bearer header.
 *
 * On a 401, refreshes the session once and retries with the new token; if
 * there's no session to refresh or the retry is also a 401, the session is
 * genuinely invalid — signs out, which AuthProvider's route guard picks up
 * to send the user back to Login. A 429 becomes a RateLimitedError with a
 * ready-to-display message rather than the raw server JSON. Never logs the
 * access token or any part of the Authorization header.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = await getAccessToken();

  let response: Response;
  try {
    response = await send(path, token, options);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError("timeout", "Request timed out. Check your connection and try again.", 0);
    }
    throw new ApiError("network", "Network error. Check your connection and try again.", 0);
  }

  if (response.status === 401) {
    const refreshedToken = await refreshAccessToken();
    if (!refreshedToken) {
      await signOut();
      throw new ApiError("session_expired", "Your session expired. Please sign in again.", 401);
    }

    try {
      response = await send(path, refreshedToken, options);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ApiError("timeout", "Request timed out. Check your connection and try again.", 0);
      }
      throw new ApiError("network", "Network error. Check your connection and try again.", 0);
    }

    if (response.status === 401) {
      await signOut();
      throw new ApiError("session_expired", "Your session expired. Please sign in again.", 401);
    }
  }

  if (response.status === 429) {
    throw new ApiError("rate_limited", "You're doing that too fast — try again in a minute.", 429);
  }

  const body = await parseJsonBody(response);

  if (!response.ok) {
    const message = isErrorBody(body) ? body.error : `Request failed (${response.status}).`;
    throw new ApiError("http", message, response.status);
  }

  if (body === null) {
    throw new ApiError("http", "Empty response from server.", response.status);
  }

  return body as T;
}
