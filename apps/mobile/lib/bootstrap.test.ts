import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./api";
import { invalidateBootstrapCache, loadBootstrap, type BootstrapState } from "./bootstrap";

/**
 * `lib/api` is mocked rather than imported through, because importing it
 * reaches `lib/supabase`, which reads EXPO_PUBLIC_* at module scope and
 * registers an AppState listener — neither of which exists under Node. The
 * mock defines its own ApiError so that `instanceof` inside bootstrap.ts
 * still matches: both sides resolve to this same module instance.
 */
vi.mock("./api", () => {
  class ApiError extends Error {
    readonly kind: string;
    readonly status: number;
    constructor(kind: string, message: string, status: number) {
      super(message);
      this.name = "ApiError";
      this.kind = kind;
      this.status = status;
    }
  }
  return { ApiError, apiFetch: vi.fn() };
});

const fetchMock = vi.mocked(apiFetch);

function stateFixture(overrides: Partial<BootstrapState> = {}): BootstrapState {
  return {
    date: "2026-10-14",
    profile: {
      id: "user-1",
      username: "hunter",
      level: 3,
      xp: 120,
      rank: "D",
      title_id: null,
      timezone: "Asia/Manila",
      created_at: "2026-10-01T00:00:00Z",
    },
    stats: { user_id: "user-1", str: 1, agi: 2, vit: 3, int: 4, focus: 5 },
    streak: {
      user_id: "user-1",
      current: 2,
      longest: 7,
      last_completed_date: "2026-10-13",
      grace_days_used: 0,
    },
    quests: [],
    activityCount: 1,
    titles: [],
    ...overrides,
  };
}

/** A promise whose settlement the test controls, for racing against invalidation. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  fetchMock.mockReset();
  // Module-level cache: without this, each test inherits the last one's entry.
  invalidateBootstrapCache();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("loadBootstrap", () => {
  it("fetches once and serves the cache within the TTL", async () => {
    fetchMock.mockResolvedValue(stateFixture());

    const first = await loadBootstrap();
    const second = await loadBootstrap();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/bootstrap");
    expect(second).toBe(first);
  });

  it("refetches once the TTL has passed", async () => {
    // Only Date is faked: the cache compares timestamps, and faking every
    // timer here would also capture the retry delays and the awaited promises.
    vi.useFakeTimers({ toFake: ["Date"] });
    fetchMock.mockResolvedValue(stateFixture());

    await loadBootstrap();
    vi.setSystemTime(Date.now() + 5001);
    await loadBootstrap();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives two concurrent callers the same in-flight request", async () => {
    const d = deferred<BootstrapState>();
    fetchMock.mockReturnValue(d.promise);

    const a = loadBootstrap();
    const b = loadBootstrap();
    d.resolve(stateFixture());

    expect(await a).toBe(await b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refetches after invalidation", async () => {
    fetchMock.mockResolvedValue(stateFixture());

    await loadBootstrap();
    invalidateBootstrapCache();
    await loadBootstrap();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache a response that was in flight when the state changed", async () => {
    // The regression this guards: a pull-to-refresh begun just before a quest
    // completion used to resolve afterwards and install its pre-completion
    // answer as the cached truth, leaving the board showing the quest pending.
    const inFlight = deferred<BootstrapState>();
    const stale = stateFixture({ activityCount: 1 });
    const fresh = stateFixture({ activityCount: 99 });

    fetchMock.mockReturnValueOnce(inFlight.promise).mockResolvedValueOnce(fresh);

    const pending = loadBootstrap();
    invalidateBootstrapCache();
    inFlight.resolve(stale);

    // Distinguished by activityCount rather than identity: the loader validates
    // the response into a fresh object, so there is no reference to compare.
    // Still handed to the caller that asked before the change...
    expect((await pending).activityCount).toBe(1);
    // ...but it must not have become anyone else's answer.
    expect((await loadBootstrap()).activityCount).toBe(99);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not leave a failed request stuck as in-flight", async () => {
    fetchMock.mockRejectedValueOnce(new ApiError("network", "offline", 0));
    await expect(loadBootstrap()).rejects.toThrow("offline");

    fetchMock.mockResolvedValueOnce(stateFixture());
    await expect(loadBootstrap()).resolves.toMatchObject({ date: "2026-10-14" });
  });

  it("rejects a response missing the profile rather than returning a partial state", async () => {
    fetchMock.mockResolvedValue({ ...stateFixture(), profile: null });
    await expect(loadBootstrap()).rejects.toThrow(/isn't ready yet/);
  });
});

describe("loadBootstrap retry on a fresh signup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("retries a 404 and succeeds once the profile row exists", async () => {
    // The signup trigger that creates the profile runs server-side, async
    // relative to the client getting its session, so the first call after a
    // brand-new sign-in can legitimately beat it.
    fetchMock
      .mockRejectedValueOnce(new ApiError("http", "Profile not found", 404))
      .mockResolvedValueOnce(stateFixture());

    const pending = loadBootstrap();
    await vi.advanceTimersByTimeAsync(500);

    await expect(pending).resolves.toMatchObject({ date: "2026-10-14" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after the retries are exhausted", async () => {
    fetchMock.mockRejectedValue(new ApiError("http", "Profile not found", 404));

    const pending = loadBootstrap();
    const assertion = expect(pending).rejects.toThrow("Profile not found");
    await vi.advanceTimersByTimeAsync(1500);
    await assertion;

    // Three attempts: the first, then one per configured delay.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry an error that isn't a missing profile", async () => {
    fetchMock.mockRejectedValue(new ApiError("rate_limited", "too fast", 429));

    await expect(loadBootstrap()).rejects.toThrow("too fast");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
