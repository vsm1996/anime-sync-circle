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

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn() },
}));

import { useSharedWatchlist } from "./useSharedWatchlist";
import { supabase } from "@/integrations/supabase/client";

const mockFrom = vi.mocked(supabase.from);

async function pollUntil(predicate: () => boolean, timeoutMs = 3000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error("Timeout waiting for condition");
    await new Promise((r) => setTimeout(r, 10));
  }
}

const fakeAnime = {
  mal_id: 1, title: "Attack on Titan", title_english: "Attack on Titan",
  image_url: null, episodes: 25, status: "Finished Airing",
  synopsis: null, score: 9.0, genres: ["Action", "Drama"], cached_at: null,
};

const fakeProfile = {
  id: "u1", username: "alice", display_name: "Alice",
  avatar_url: null, created_at: null, updated_at: null,
};

const fakeItem = {
  id: "w1", circle_id: "c1", mal_id: 1, added_by: "u1",
  priority: 0, status: "queued", votes: 0, created_at: null,
};

// Setup: 4 from calls when userId provided (watchlists + anime + profiles + votes)
// Setup: 3 from calls when no userId (watchlists + anime + profiles, votes skipped)
function mockFetch(
  items: unknown[],
  { anime = [fakeAnime], profiles = [fakeProfile], votes = [] as unknown[], userId = "u1" } = {}
) {
  mockFrom
    .mockReturnValueOnce(buildChain({ data: items, error: null }))          // shared_watchlists
    .mockReturnValueOnce(buildChain({ data: anime, error: null }))           // anime_cache
    .mockReturnValueOnce(buildChain({ data: profiles, error: null }));       // profiles
  if (userId) {
    mockFrom.mockReturnValueOnce(buildChain({ data: votes, error: null }));  // watchlist_votes
  }
}

describe("useSharedWatchlist", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("does not fetch when circleId is undefined", async () => {
    const { result } = renderHook(() => useSharedWatchlist(undefined, "u1"));
    await pollUntil(() => !result.current.loading);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(result.current.items).toEqual([]);
  });

  it("fetches items with anime and profile enrichment", async () => {
    mockFetch([fakeItem]);

    const { result } = renderHook(() => useSharedWatchlist("c1", "u1"));
    await pollUntil(() => !result.current.loading);

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].anime?.title).toBe("Attack on Titan");
    expect(result.current.items[0].addedByProfile?.username).toBe("alice");
  });

  it("maps user vote onto items", async () => {
    mockFetch([fakeItem], { votes: [{ watchlist_id: "w1", vote: 1 }] });

    const { result } = renderHook(() => useSharedWatchlist("c1", "u1"));
    await pollUntil(() => !result.current.loading);

    expect(result.current.items[0].userVote).toBe(1);
  });

  it("userVote is null when user has not voted", async () => {
    mockFetch([fakeItem], { votes: [] });

    const { result } = renderHook(() => useSharedWatchlist("c1", "u1"));
    await pollUntil(() => !result.current.loading);

    expect(result.current.items[0].userVote).toBeNull();
  });

  it("skips vote fetch when no userId", async () => {
    mockFetch([fakeItem], { userId: "" });

    const { result } = renderHook(() => useSharedWatchlist("c1", undefined));
    await pollUntil(() => !result.current.loading);

    expect(result.current.items).toHaveLength(1);
    // Only 3 from calls (no watchlist_votes)
    expect(mockFrom).toHaveBeenCalledTimes(3);
  });

  it("returns empty items when data is null (early exit)", async () => {
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null }));

    const { result } = renderHook(() => useSharedWatchlist("c1", "u1"));
    await pollUntil(() => !result.current.loading);

    expect(result.current.items).toEqual([]);
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("handles multiple items sorted by votes descending", async () => {
    const item2 = { ...fakeItem, id: "w2", mal_id: 2, votes: 5 };
    const anime2 = { ...fakeAnime, mal_id: 2, title: "Death Note" };
    mockFetch([item2, fakeItem], { anime: [fakeAnime, anime2] });

    const { result } = renderHook(() => useSharedWatchlist("c1", "u1"));
    await pollUntil(() => !result.current.loading);

    expect(result.current.items).toHaveLength(2);
  });

  it("addToWatchlist succeeds and refreshes list", async () => {
    mockFetch([]);                                                              // initial
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null }));      // upsert
    mockFetch([fakeItem]);                                                      // re-fetch

    const { result } = renderHook(() => useSharedWatchlist("c1", "u1"));
    await pollUntil(() => !result.current.loading);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let outcome: any;
    await act(async () => {
      outcome = await result.current.addToWatchlist(1, "u1");
    });

    expect(outcome.error).toBeNull();
    await pollUntil(() => result.current.items.length === 1);
  });

  it("addToWatchlist propagates error without refreshing", async () => {
    const pgError = { message: "unique constraint violation" };
    mockFetch([]);
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: pgError }));

    const { result } = renderHook(() => useSharedWatchlist("c1", "u1"));
    await pollUntil(() => !result.current.loading);
    const callsBefore = mockFrom.mock.calls.length;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let outcome: any;
    await act(async () => {
      outcome = await result.current.addToWatchlist(1, "u1");
    });

    expect(outcome.error).toEqual(pgError);
    expect(mockFrom.mock.calls.length).toBe(callsBefore + 1); // no re-fetch
  });

  it("removeFromWatchlist succeeds and refreshes list", async () => {
    mockFetch([fakeItem]);
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null })); // delete
    mockFetch([]);                                                          // re-fetch

    const { result } = renderHook(() => useSharedWatchlist("c1", "u1"));
    await pollUntil(() => !result.current.loading);
    expect(result.current.items).toHaveLength(1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let outcome: any;
    await act(async () => {
      outcome = await result.current.removeFromWatchlist("w1");
    });

    expect(outcome.error).toBeNull();
    await pollUntil(() => result.current.items.length === 0);
  });

  it("removeFromWatchlist propagates error without refreshing", async () => {
    const pgError = { message: "not found" };
    mockFetch([fakeItem]);
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: pgError }));

    const { result } = renderHook(() => useSharedWatchlist("c1", "u1"));
    await pollUntil(() => !result.current.loading);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let outcome: any;
    await act(async () => {
      outcome = await result.current.removeFromWatchlist("w1");
    });

    expect(outcome.error).toEqual(pgError);
  });

  it("vote upvotes when no existing vote", async () => {
    mockFetch([fakeItem], { votes: [] });
    // vote: upsert watchlist_votes + update shared_watchlists votes count
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null })); // upsert vote
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null })); // update votes
    const upvotedItem = { ...fakeItem, votes: 1 };
    mockFetch([upvotedItem], { votes: [{ watchlist_id: "w1", vote: 1 }] });

    const { result } = renderHook(() => useSharedWatchlist("c1", "u1"));
    await pollUntil(() => !result.current.loading);

    await act(async () => {
      await result.current.vote("w1", 1, "u1");
    });

    await pollUntil(() => result.current.items[0]?.userVote === 1);
    expect(result.current.items[0].votes).toBe(1);
  });

  it("vote removes existing vote when same value toggled", async () => {
    const votedItem = { ...fakeItem, votes: 1 };
    mockFetch([votedItem], { votes: [{ watchlist_id: "w1", vote: 1 }] });
    // toggle off: delete vote + update votes
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null })); // delete vote
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null })); // update votes
    mockFetch([fakeItem], { votes: [] });

    const { result } = renderHook(() => useSharedWatchlist("c1", "u1"));
    await pollUntil(() => !result.current.loading);
    expect(result.current.items[0].userVote).toBe(1);

    await act(async () => {
      await result.current.vote("w1", 1, "u1");
    });

    await pollUntil(() => result.current.items[0]?.userVote === null);
    expect(result.current.items[0].votes).toBe(0);
  });

  it("vote changes from upvote to downvote", async () => {
    const upvotedItem = { ...fakeItem, votes: 1 };
    mockFetch([upvotedItem], { votes: [{ watchlist_id: "w1", vote: 1 }] });
    // change: upsert vote + update votes
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null })); // upsert vote
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null })); // update votes
    const downvotedItem = { ...fakeItem, votes: -1 };
    mockFetch([downvotedItem], { votes: [{ watchlist_id: "w1", vote: -1 }] });

    const { result } = renderHook(() => useSharedWatchlist("c1", "u1"));
    await pollUntil(() => !result.current.loading);

    await act(async () => {
      await result.current.vote("w1", -1, "u1");
    });

    await pollUntil(() => result.current.items[0]?.userVote === -1);
    expect(result.current.items[0].votes).toBe(-1);
  });

  it("refetch re-queries the watchlist", async () => {
    mockFetch([fakeItem]);
    mockFetch([fakeItem]); // second fetch

    const { result } = renderHook(() => useSharedWatchlist("c1", "u1"));
    await pollUntil(() => !result.current.loading);
    const callsBefore = mockFrom.mock.calls.length;

    await act(async () => { await result.current.refetch(); });
    expect(mockFrom.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
