import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { bootMark } from "./bootTrace";
import { useSession } from "./AuthProvider";
import { needsOnboarding as checkNeedsOnboarding } from "./onboarding";
import { setTimezone } from "./profile";

export type OnboardingStatus = "loading" | "needs-onboarding" | "ready";

interface OnboardingContextValue {
  status: OnboardingStatus;
  /** Called once the onboarding screen finishes (name set, template seeded or skipped). */
  completeOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

/**
 * Pushes the device's IANA timezone server-side. Quest generation reads
 * `profiles.timezone` to decide which local day to generate for, and the column
 * defaults to 'UTC', so a brand-new account has to have this land before its first
 * generate — which is why `completeOnboarding` awaits it.
 *
 * A returning user already has the right value stored from a previous session, so
 * there it runs un-awaited: nothing on Home needs it to render, and awaiting it put
 * a Vercel round trip in front of the first frame.
 */
async function bootstrapSession(): Promise<void> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  await setTimezone(timezone).catch(() => {});
}

/**
 * Tracks whether the signed-in user still needs onboarding (zero categories). The
 * root layout reads `status` to decide between (app), (onboarding), and holding the
 * splash.
 *
 * Quest generation is deliberately NOT part of this: POST /api/bootstrap runs it
 * server-side before reading, so opening the app generates exactly once, inside
 * the one request that also fetches everything the first screen draws.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  // Keyed on the user id, not the session object: supabase-js hands
  // onAuthStateChange a brand-new Session on every TOKEN_REFRESHED (roughly
  // hourly, and on resume), and re-running this effect for the same user
  // would drop the app back to the root layout's loading spinner and lose
  // whatever screen they were on.
  const userId = session?.user.id ?? null;
  const [status, setStatus] = useState<OnboardingStatus>("loading");

  useEffect(() => {
    let isMounted = true;

    async function run() {
      if (!userId) {
        setStatus("loading");
        return;
      }

      setStatus("loading");

      try {
        const needsIt = await checkNeedsOnboarding(userId);
        bootMark("onboarding check");
        if (!isMounted) return;

        if (needsIt) {
          setStatus("needs-onboarding");
          return;
        }

        setStatus("ready");
        void bootstrapSession();
      } catch {
        // Can't tell whether onboarding is needed — fail toward showing the
        // app rather than stranding the user on a spinner forever; Home's
        // own error state covers a genuinely broken backend.
        if (isMounted) setStatus("ready");
      }
    }

    void run();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  function completeOnboarding() {
    setStatus("loading");
    bootstrapSession().finally(() => setStatus("ready"));
  }

  return (
    <OnboardingContext.Provider value={{ status, completeOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
