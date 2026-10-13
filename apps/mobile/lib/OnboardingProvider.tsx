import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useSession } from "./AuthProvider";
import { needsOnboarding as checkNeedsOnboarding } from "./onboarding";
import { setTimezone } from "./profile";
import { generateQuests } from "./quests";

export type OnboardingStatus = "loading" | "needs-onboarding" | "ready";

interface OnboardingContextValue {
  status: OnboardingStatus;
  /** Called once the onboarding screen finishes (name set, template seeded or skipped). */
  completeOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

/** Sets the device's IANA timezone server-side, then generates today's quests. Best-effort —
 * a failure here shouldn't block entry to the app; Home's own fetch/pull-to-refresh cover it. */
async function bootstrapSession(): Promise<void> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  await setTimezone(timezone).catch(() => {});
  await generateQuests().catch(() => {});
}

/**
 * Tracks whether the signed-in user still needs onboarding (zero
 * categories), and runs the once-per-sign-in bootstrap (device timezone +
 * quest generation) once they don't. The root layout reads `status` to
 * decide between (app), (onboarding), and a loading spinner.
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
        if (!isMounted) return;

        if (needsIt) {
          setStatus("needs-onboarding");
          return;
        }

        await bootstrapSession();
        if (isMounted) setStatus("ready");
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
