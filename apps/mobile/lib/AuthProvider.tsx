import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { invalidateBootstrapCache } from "./bootstrap";
import { bootMark } from "./bootTrace";
import { supabase } from "./supabase";

interface AuthContextValue {
  session: Session | null;
  /** True only while the initial session restore is in flight. */
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Tracked separately from `session` because this has to be compared against
  // outside of render — see the invalidation below.
  const currentUserId = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      bootMark("session restore");
      if (!isMounted) return;
      currentUserId.current = data.session?.user.id ?? null;
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;

      // The bootstrap cache lives at module scope and is keyed on nothing but
      // "the signed-in user", because the server derives that from the JWT
      // rather than taking a user id. So a change of user has to drop it:
      // otherwise the next account to sign in on this device can be served the
      // previous one's profile, stats and quests for as long as the entry stays
      // fresh. Compared by user id, not by session identity — supabase-js hands
      // this callback a brand-new Session on every token refresh, and throwing
      // the cache away hourly would defeat it.
      const nextUserId = newSession?.user.id ?? null;
      if (nextUserId !== currentUserId.current) {
        currentUserId.current = nextUserId;
        invalidateBootstrapCache();
      }

      setSession(newSession);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
}

export function useSession(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useSession must be used within an AuthProvider");
  }
  return context;
}
