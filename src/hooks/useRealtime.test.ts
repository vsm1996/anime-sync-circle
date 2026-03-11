import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

type AnyFn = (...args: unknown[]) => unknown;

function buildChain(resolveWith: { data: unknown; error: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  const terminal = Promise.resolve(resolveWith);
  ["select", "insert", "eq", "single", "update", "delete", "upsert", "order", "limit", "in"].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.then = (res: AnyFn, rej: AnyFn) => terminal.then(res, rej);
  chain.catch = (rej: AnyFn) => terminal.catch(rej);
  return chain;
}

// ---------------------------------------------------------------------------
// Channel mock (used for both activity realtime and presence)
// ---------------------------------------------------------------------------
const mockUnsubscribe = vi.fn();
const mockTrack = vi.fn().mockResolvedValue(undefined);
const mockPresenceState = vi.fn().mockReturnValue({});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let capturedPresenceCallbacks: Record<string, (...args: any[]) => void> = {};
let capturedRealtimeCallback: (() => void) | null = null;
let subscribeCallback: ((status: string) => Promise<void>) | null = null;

const mockChannel = {
  on: vi.fn((type: string, eventOrFilter: unknown, callback: AnyFn) => {
    if (type === "presence") {
      const event = (eventOrFilter as { event: string }).event;
      capturedPresenceCallbacks[event] = callback as (...args: unknown[]) => void;
    } else if (type === "postgres_changes") {
      capturedRealtimeCallback = callback as () => void;
    }
    return mockChannel;
  }),
  subscribe: vi.fn((cb?: (status: string) => Promise<void>) => {
    subscribeCallback = cb ?? null;
    return mockChannel;
  }),
  unsubscribe: mockUnsubscribe,
  presenceState: mockPresenceState,
  track: mockTrack,
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
  },
}));

import { useActivityFeed, usePresence } from "./useRealtime";
import { supabase } from "@/integrations/supabase/client";

const mockFrom = vi.mocked(supabase.from);
const mockChannelFn = vi.mocked(supabase.channel);

async function pollUntil(predicate: () => boolean, timeoutMs = 3000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error("Timeout waiting for condition");
    await new Promise((r) => setTimeout(r, 10));
  }
}

const fakeProfile = {
  id: "u1", username: "alice", display_name: "Alice",
  avatar_url: null, created_at: null, updated_at: null,
};

const fakeAnime = {
  mal_id: 1, title: "Fullmetal Alchemist", title_english: null,
  image_url: null, episodes: 64, status: "Finished Airing",
  synopsis: null, score: 9.1, genres: ["Action"], cached_at: null,
};

const fakeActivity = {
  id: "a1", user_id: "u1", circle_id: "c1",
  action: "started_watching", mal_id: 1,
  metadata: {}, created_at: "2026-03-11T00:00:00Z",
};

// Activity feed fetch: enrichActivities only calls from("profiles") / from("anime_cache")
// when there are non-empty userIds / malIds. Empty activity list = 1 from call total.
function mockFeedFetch(
  activities: unknown[],
  { profiles = [fakeProfile], animes = [fakeAnime] } = {}
) {
  mockFrom.mockReturnValueOnce(buildChain({ data: activities, error: null })); // activity_log
  // Only queue enrichment mocks when activities have data with user_ids/mal_ids
  const hasUsers = (activities as Array<{user_id?: unknown}>).some((a) => a.user_id);
  const hasAnime = (activities as Array<{mal_id?: unknown}>).some((a) => a.mal_id);
  if (hasUsers) mockFrom.mockReturnValueOnce(buildChain({ data: profiles, error: null }));
  if (hasAnime) mockFrom.mockReturnValueOnce(buildChain({ data: animes, error: null }));
}

// ---------------------------------------------------------------------------
// useActivityFeed
// ---------------------------------------------------------------------------
describe("useActivityFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedPresenceCallbacks = {};
    capturedRealtimeCallback = null;
    subscribeCallback = null;
    mockChannelFn.mockReturnValue(mockChannel as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  it("does not fetch when circleId is undefined", async () => {
    const { result } = renderHook(() => useActivityFeed(undefined));
    await pollUntil(() => !result.current.loading);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(result.current.activities).toEqual([]);
  });

  it("fetches and enriches activities with profiles and anime", async () => {
    mockFeedFetch([fakeActivity]);

    const { result } = renderHook(() => useActivityFeed("c1"));
    await pollUntil(() => !result.current.loading);

    expect(result.current.activities).toHaveLength(1);
    expect(result.current.activities[0].action).toBe("started_watching");
    expect(result.current.activities[0].profile?.username).toBe("alice");
    expect(result.current.activities[0].anime?.title).toBe("Fullmetal Alchemist");
  });

  it("handles activities with no user_id or mal_id", async () => {
    const systemActivity = { ...fakeActivity, user_id: null, mal_id: null };
    mockFrom
      .mockReturnValueOnce(buildChain({ data: [systemActivity], error: null })) // activity_log
      // No profiles or anime fetch since userIds/malIds are empty
      ;

    // Since user_ids and mal_ids are empty, Promise.all uses the early-return path
    // (Promise.resolve({ data: [] })) — no from() calls for those
    const { result } = renderHook(() => useActivityFeed("c1"));
    await pollUntil(() => !result.current.loading);

    expect(result.current.activities).toHaveLength(1);
    expect(result.current.activities[0].profile).toBeUndefined();
    expect(result.current.activities[0].anime).toBeUndefined();
  });

  it("returns empty when data is null (early exit)", async () => {
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null }));

    const { result } = renderHook(() => useActivityFeed("c1"));
    await pollUntil(() => !result.current.loading);

    expect(result.current.activities).toEqual([]);
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("subscribes to realtime channel on mount", async () => {
    mockFeedFetch([]);

    renderHook(() => useActivityFeed("c1"));
    await pollUntil(() => mockChannelFn.mock.calls.length > 0);

    expect(mockChannelFn).toHaveBeenCalledWith(expect.stringContaining("activity-c1"));
    expect(mockChannel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({ event: "INSERT", table: "activity_log" }),
      expect.any(Function)
    );
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it("refetches when realtime event fires", async () => {
    mockFeedFetch([]);                      // initial fetch
    mockFeedFetch([fakeActivity]);          // re-fetch after realtime event

    const { result } = renderHook(() => useActivityFeed("c1"));
    await pollUntil(() => !result.current.loading);

    await act(async () => {
      capturedRealtimeCallback?.();
    });

    await pollUntil(() => result.current.activities.length === 1);
    expect(result.current.activities[0].action).toBe("started_watching");
  });

  it("unsubscribes channel on unmount", async () => {
    mockFeedFetch([]);

    const { unmount } = renderHook(() => useActivityFeed("c1"));
    await pollUntil(() => !mockFrom.mock.results[0]?.value || mockFrom.mock.calls.length >= 1);

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("logActivity inserts to activity_log", async () => {
    mockFeedFetch([]);

    const { result } = renderHook(() => useActivityFeed("c1"));
    await pollUntil(() => !result.current.loading);

    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null }));

    await act(async () => {
      await result.current.logActivity("u1", "completed", 1, { episode: 64 });
    });

    const lastCall = mockFrom.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe("activity_log");
  });

  it("logActivity works without mal_id or metadata", async () => {
    mockFeedFetch([]);

    const { result } = renderHook(() => useActivityFeed("c1"));
    await pollUntil(() => !result.current.loading);

    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null }));

    await act(async () => {
      await result.current.logActivity("u1", "joined_circle");
    });

    const insertChain = mockFrom.mock.results.at(-1)?.value;
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ mal_id: null, metadata: {} }),
      ])
    );
  });

  it("refetch is exposed and re-fetches activities", async () => {
    mockFeedFetch([]);
    mockFeedFetch([fakeActivity]);

    const { result } = renderHook(() => useActivityFeed("c1"));
    await pollUntil(() => !result.current.loading);
    expect(result.current.activities).toHaveLength(0);

    await act(async () => { await result.current.refetch(); });
    await pollUntil(() => result.current.activities.length === 1);
  });
});

// ---------------------------------------------------------------------------
// usePresence
// ---------------------------------------------------------------------------
describe("usePresence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedPresenceCallbacks = {};
    subscribeCallback = null;
    mockPresenceState.mockReturnValue({});
    mockChannelFn.mockReturnValue(mockChannel as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  it("does not subscribe when circleId is undefined", () => {
    renderHook(() => usePresence(undefined, "u1", "Alice"));
    expect(mockChannelFn).not.toHaveBeenCalled();
  });

  it("does not subscribe when userId is undefined", () => {
    renderHook(() => usePresence("c1", undefined, "Alice"));
    expect(mockChannelFn).not.toHaveBeenCalled();
  });

  it("starts with empty onlineUsers", () => {
    renderHook(() => usePresence(undefined, undefined));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { result } = renderHook(() => usePresence(undefined, undefined));
    expect(result.current.onlineUsers).toEqual([]);
    expect(result.current.onlineCount).toBe(0);
  });

  it("creates presence channel with correct config", () => {
    renderHook(() => usePresence("c1", "u1", "Alice"));

    expect(mockChannelFn).toHaveBeenCalledWith(
      "presence-c1",
      expect.objectContaining({ config: { presence: { key: "u1" } } })
    );
  });

  it("calls track with user info when SUBSCRIBED", async () => {
    renderHook(() => usePresence("c1", "u1", "Alice"));

    await act(async () => {
      await subscribeCallback?.("SUBSCRIBED");
    });

    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1", display_name: "Alice" })
    );
  });

  it("uses 'Unknown' as display_name when not provided", async () => {
    renderHook(() => usePresence("c1", "u1"));

    await act(async () => {
      await subscribeCallback?.("SUBSCRIBED");
    });

    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: "Unknown" })
    );
  });

  it("does not track when status is not SUBSCRIBED", async () => {
    renderHook(() => usePresence("c1", "u1", "Alice"));

    await act(async () => {
      await subscribeCallback?.("CONNECTING");
    });

    expect(mockTrack).not.toHaveBeenCalled();
  });

  it("updates onlineUsers on presence sync event", async () => {
    const presenceData = { u1: [{ user_id: "u1", display_name: "Alice" }] };
    mockPresenceState.mockReturnValue(presenceData);

    const { result } = renderHook(() => usePresence("c1", "u1", "Alice"));

    await act(async () => {
      capturedPresenceCallbacks["sync"]?.();
    });

    expect(result.current.onlineUsers).toHaveLength(1);
    expect(result.current.onlineCount).toBe(1);
  });

  it("updates onlineUsers on presence join event", async () => {
    const presenceData = {
      u1: [{ user_id: "u1", display_name: "Alice" }],
      u2: [{ user_id: "u2", display_name: "Bob" }],
    };
    mockPresenceState.mockReturnValue(presenceData);

    const { result } = renderHook(() => usePresence("c1", "u1", "Alice"));

    await act(async () => {
      capturedPresenceCallbacks["join"]?.();
    });

    expect(result.current.onlineCount).toBe(2);
  });

  it("updates onlineUsers on presence leave event", async () => {
    mockPresenceState.mockReturnValue({});

    const { result } = renderHook(() => usePresence("c1", "u1", "Alice"));

    await act(async () => {
      capturedPresenceCallbacks["leave"]?.();
    });

    expect(result.current.onlineCount).toBe(0);
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => usePresence("c1", "u1", "Alice"));
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
