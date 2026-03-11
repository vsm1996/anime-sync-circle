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

import { useWatchEntries } from "./useWatchEntries";
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
  mal_id: 1, title: "Naruto", title_english: "Naruto",
  image_url: null, episodes: 220, status: "Finished Airing",
  synopsis: null, score: 7.9, genres: ["Action"], cached_at: null,
};

const fakeEntry = {
  id: "e1", user_id: "u1", mal_id: 1, status: "watching",
  episodes_watched: 10, rating: null, notes: null,
  started_at: null, completed_at: null, updated_at: null, created_at: null,
};

// Returns 2 consecutive mocks: watch_entries then anime_cache (always needed together)
function mockFetch(entries: unknown[], animes: unknown[] = [fakeAnime]) {
  mockFrom
    .mockReturnValueOnce(buildChain({ data: entries, error: null }))
    .mockReturnValueOnce(buildChain({ data: animes, error: null }));
}

describe("useWatchEntries", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("does not fetch when userId is undefined", async () => {
    const { result } = renderHook(() => useWatchEntries(undefined));
    await pollUntil(() => !result.current.loading);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(result.current.entries).toEqual([]);
  });

  it("fetches entries and enriches with anime data", async () => {
    mockFetch([fakeEntry]);

    const { result } = renderHook(() => useWatchEntries("u1"));
    await pollUntil(() => !result.current.loading);

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].status).toBe("watching");
    expect(result.current.entries[0].anime?.title).toBe("Naruto");
    expect(result.current.entries[0].anime?.score).toBe(7.9);
  });

  it("returns empty entries when data is null (early exit)", async () => {
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null }));

    const { result } = renderHook(() => useWatchEntries("u1"));
    await pollUntil(() => !result.current.loading);

    expect(result.current.entries).toEqual([]);
  });

  it("returns entries without anime when anime_cache returns nothing", async () => {
    mockFetch([fakeEntry], []);

    const { result } = renderHook(() => useWatchEntries("u1"));
    await pollUntil(() => !result.current.loading);

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].anime).toBeUndefined();
  });

  it("fetches multiple entries with correct anime mapping", async () => {
    const entry2 = { ...fakeEntry, id: "e2", mal_id: 2 };
    const anime2 = { ...fakeAnime, mal_id: 2, title: "One Piece" };
    mockFetch([fakeEntry, entry2], [fakeAnime, anime2]);

    const { result } = renderHook(() => useWatchEntries("u1"));
    await pollUntil(() => !result.current.loading);

    expect(result.current.entries).toHaveLength(2);
    expect(result.current.entries[0].anime?.title).toBe("Naruto");
    expect(result.current.entries[1].anime?.title).toBe("One Piece");
  });

  it("addEntry succeeds and refreshes list", async () => {
    const newEntry = { ...fakeEntry, id: "e2", status: "plan_to_watch" };
    mockFetch([], []);                                                        // initial fetch
    mockFrom.mockReturnValueOnce(buildChain({ data: newEntry, error: null })); // upsert
    mockFetch([newEntry]);                                                     // re-fetch

    const { result } = renderHook(() => useWatchEntries("u1"));
    await pollUntil(() => !result.current.loading);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let outcome: any;
    await act(async () => {
      outcome = await result.current.addEntry("u1", 1, "plan_to_watch");
    });

    expect(outcome.error).toBeNull();
    await pollUntil(() => result.current.entries.length === 1);
    expect(result.current.entries[0].status).toBe("plan_to_watch");
  });

  it("addEntry uses plan_to_watch as default status", async () => {
    mockFetch([], []);
    mockFrom.mockReturnValueOnce(buildChain({ data: fakeEntry, error: null }));
    mockFetch([fakeEntry]);

    const { result } = renderHook(() => useWatchEntries("u1"));
    await pollUntil(() => !result.current.loading);

    await act(async () => { await result.current.addEntry("u1", 1); });

    const upsertChain = mockFrom.mock.results[2]?.value;
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: "plan_to_watch" }),
      expect.any(Object)
    );
  });

  it("addEntry propagates db error without refreshing", async () => {
    const pgError = { message: "duplicate key value" };
    mockFetch([], []);
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: pgError }));

    const { result } = renderHook(() => useWatchEntries("u1"));
    await pollUntil(() => !result.current.loading);
    const callCountBefore = mockFrom.mock.calls.length;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let outcome: any;
    await act(async () => {
      outcome = await result.current.addEntry("u1", 1, "watching");
    });

    expect(outcome.error).toEqual(pgError);
    expect(mockFrom.mock.calls.length).toBe(callCountBefore + 1); // no re-fetch
  });

  it("updateEntry succeeds and refreshes list", async () => {
    const updatedEntry = { ...fakeEntry, status: "completed", episodes_watched: 220 };
    mockFetch([fakeEntry]);
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null })); // update
    mockFetch([updatedEntry]);

    const { result } = renderHook(() => useWatchEntries("u1"));
    await pollUntil(() => !result.current.loading);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let outcome: any;
    await act(async () => {
      outcome = await result.current.updateEntry("e1", { status: "completed", episodes_watched: 220 });
    });

    expect(outcome.error).toBeNull();
    await pollUntil(() => result.current.entries[0]?.status === "completed");
  });

  it("updateEntry propagates error without refreshing", async () => {
    const pgError = { message: "not found" };
    mockFetch([fakeEntry]);
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: pgError }));

    const { result } = renderHook(() => useWatchEntries("u1"));
    await pollUntil(() => !result.current.loading);
    const callCountBefore = mockFrom.mock.calls.length;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let outcome: any;
    await act(async () => {
      outcome = await result.current.updateEntry("e1", { status: "dropped" });
    });

    expect(outcome.error).toEqual(pgError);
    expect(mockFrom.mock.calls.length).toBe(callCountBefore + 1);
  });

  it("deleteEntry succeeds and removes entry from list", async () => {
    mockFetch([fakeEntry]);
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null })); // delete
    mockFetch([], []);                                                      // re-fetch

    const { result } = renderHook(() => useWatchEntries("u1"));
    await pollUntil(() => !result.current.loading);
    expect(result.current.entries).toHaveLength(1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let outcome: any;
    await act(async () => {
      outcome = await result.current.deleteEntry("e1");
    });

    expect(outcome.error).toBeNull();
    await pollUntil(() => result.current.entries.length === 0);
  });

  it("deleteEntry propagates error without refreshing", async () => {
    const pgError = { message: "not found" };
    mockFetch([fakeEntry]);
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: pgError }));

    const { result } = renderHook(() => useWatchEntries("u1"));
    await pollUntil(() => !result.current.loading);
    const callCountBefore = mockFrom.mock.calls.length;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let outcome: any;
    await act(async () => {
      outcome = await result.current.deleteEntry("e1");
    });

    expect(outcome.error).toEqual(pgError);
    expect(mockFrom.mock.calls.length).toBe(callCountBefore + 1);
  });

  it("refetch re-queries entries", async () => {
    mockFetch([fakeEntry]);
    mockFetch([fakeEntry]); // second fetch

    const { result } = renderHook(() => useWatchEntries("u1"));
    await pollUntil(() => !result.current.loading);
    expect(mockFrom).toHaveBeenCalledTimes(2);

    await act(async () => { await result.current.refetch(); });
    expect(mockFrom).toHaveBeenCalledTimes(4);
  });
});
