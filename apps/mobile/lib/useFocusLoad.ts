import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

export type LoadMode = "initial" | "refresh" | "silent";

/**
 * First focus shows a spinner; returning later (e.g. from a detail screen)
 * silently revalidates instead of flashing one every time the screen
 * regains focus. Callers that want pull-to-refresh wire its `onRefresh` to
 * the returned `refresh`, which requests "refresh" explicitly.
 */
export function useFocusLoad(load: (mode: LoadMode) => Promise<void>) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      async function run() {
        const mode: LoadMode = isFirstFocus.current ? "initial" : "silent";
        if (mode === "initial") setLoading(true);
        try {
          await load(mode);
        } finally {
          // A `load` that throws instead of setting its own error state would
          // otherwise leave the screen on its spinner forever.
          isFirstFocus.current = false;
          if (mode === "initial") setLoading(false);
        }
      }
      void run();
    }, [load]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load("refresh");
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  return { loading, refreshing, refresh };
}
