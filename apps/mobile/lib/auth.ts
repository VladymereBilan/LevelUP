import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";

export type SignInResult =
  { status: "success" } | { status: "cancelled" } | { status: "error"; message: string };

interface ParsedCallback {
  code: string | null;
  errorMessage: string | null;
}

function parseCallbackUrl(url: string): ParsedCallback {
  const { queryParams } = Linking.parse(url);
  const code = typeof queryParams?.code === "string" ? queryParams.code : null;
  const errorDescription =
    typeof queryParams?.error_description === "string" ? queryParams.error_description : null;
  const errorCode = typeof queryParams?.error === "string" ? queryParams.error : null;
  return { code, errorMessage: errorDescription ?? errorCode };
}

/**
 * Supabase's PKCE exchange is single-use: the code verifier it was issued
 * with is consumed on the first successful exchange, so a second attempt
 * for the same code fails client-side rather than server-side. These
 * substrings are what supabase-js's PKCE implementation and GoTrue's
 * "already used" response are documented to surface for that case —
 * unverified against a live exchange, since that needs a real device
 * round-trip this environment can't perform.
 */
const CODE_ALREADY_CONSUMED_PATTERNS = [
  "code verifier",
  "flow state",
  "already used",
  "invalid grant",
  "bad_code_verifier",
];

function isCodeAlreadyConsumedError(message: string): boolean {
  const lower = message.toLowerCase();
  return CODE_ALREADY_CONSUMED_PATTERNS.some((pattern) => lower.includes(pattern));
}

let inFlightExchange: Promise<SignInResult> | null = null;
let lastHandledCode: string | null = null;

/**
 * Exchanges an OAuth authorization code for a session exactly once, even
 * if both expo-router's `auth/callback` fallback screen and
 * `signInWithGoogle`'s own `openAuthSessionAsync` call observe the same
 * redirect URL (the fallback screen only runs this if +native-intent's
 * redirect didn't already keep the router from navigating there). A
 * second call for the same code either joins the first exchange still in
 * flight, or — if it already finished — skips re-exchanging and confirms
 * a session exists instead of treating "code already used" as a failure.
 */
export async function completeGoogleSignIn(code: string): Promise<SignInResult> {
  if (code === lastHandledCode && !inFlightExchange) {
    const { data } = await supabase.auth.getSession();
    return data.session
      ? { status: "success" }
      : { status: "error", message: "Sign-in did not complete." };
  }

  if (inFlightExchange) {
    return inFlightExchange;
  }

  lastHandledCode = code;
  inFlightExchange = (async (): Promise<SignInResult> => {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return { status: "success" };
    }

    if (isCodeAlreadyConsumedError(error.message)) {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        return { status: "success" };
      }
    }

    return { status: "error", message: error.message };
  })();

  try {
    return await inFlightExchange;
  } finally {
    inFlightExchange = null;
  }
}

/**
 * Google sign-in via Supabase's hosted OAuth redirect (PKCE flow) — not
 * the native Google Sign-In SDK. Supabase itself holds the Google OAuth
 * client id/secret (configured in its dashboard); this app only ever
 * handles the anon key and the resulting session.
 *
 * Never throws: every outcome (success, user-cancelled, or a real error)
 * comes back as a tagged result for the caller to render, rather than an
 * exception the UI has to remember to catch. Never logs the authorization
 * code, any token, or the session object — only non-secret diagnostic
 * values (if any) belong in logs.
 */
export async function signInWithGoogle(): Promise<SignInResult> {
  const redirectTo = Linking.createURL("auth/callback");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });

  if (error || !data.url) {
    return { status: "error", message: error?.message ?? "Could not start Google sign-in." };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  switch (result.type) {
    case "cancel":
    case "dismiss":
      // The user closed the browser themselves — not an error.
      return { status: "cancelled" };

    case "success": {
      const { code, errorMessage } = parseCallbackUrl(result.url);
      if (errorMessage) {
        return { status: "error", message: errorMessage };
      }
      if (!code) {
        return {
          status: "error",
          message: "Sign-in callback did not include an authorization code.",
        };
      }

      return completeGoogleSignIn(code);
    }

    default:
      // Any other result (e.g. iOS "locked", or a future result type this
      // code doesn't know about yet) is unusual but not user-cancelled —
      // surface it rather than silently doing nothing.
      return { status: "error", message: `Sign-in did not complete (${result.type}).` };
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
