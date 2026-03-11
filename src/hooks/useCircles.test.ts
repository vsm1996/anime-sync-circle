import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------
type AnyFn = (...args: unknown[]) => unknown;

// A flexible chainable object that resolves to `resolveWith` when awaited.
function buildChain(resolveWith: { data: unknown; error: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  const terminal = Promise.resolve(resolveWith);
  ["select", "insert", "eq", "single", "update", "delete", "upsert"].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.then = (res: AnyFn, rej: AnyFn) => terminal.then(res, rej);
  chain.catch = (rej: AnyFn) => terminal.catch(rej);
  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Import AFTER mock is set up
import { useCircles } from "./useCircles";
import { supabase } from "@/integrations/supabase/client";

const mockFrom = vi.mocked(supabase.from);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("useCircles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not fetch when userId is undefined", async () => {
    const { result } = renderHook(() => useCircles(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFrom).not.toHaveBeenCalled();
    expect(result.current.circles).toEqual([]);
  });

  it("fetches and returns circles for a given userId", async () => {
    const fakeCircle = {
      id: "c1",
      name: "Test Circle",
      description: null,
      invite_code: "abc123",
      created_by: "u1",
      created_at: null,
    };
    mockFrom.mockReturnValue(buildChain({ data: [{ circles: fakeCircle }], error: null }));

    const { result } = renderHook(() => useCircles("u1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.circles).toHaveLength(1);
    expect(result.current.circles[0].name).toBe("Test Circle");
    expect(result.current.circles[0].invite_code).toBe("abc123");
  });

  it("returns empty array when data is null", async () => {
    mockFrom.mockReturnValue(buildChain({ data: null, error: null }));

    const { result } = renderHook(() => useCircles("u1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.circles).toEqual([]);
  });

  it("createCircle propagates db error", async () => {
    const pgError = { message: "duplicate key value violates unique constraint" };

    // mount fetch → empty list; insert → error
    mockFrom
      .mockReturnValueOnce(buildChain({ data: [], error: null }))
      .mockReturnValueOnce(buildChain({ data: null, error: pgError }));

    const { result } = renderHook(() => useCircles("u1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let outcome: any;
    await act(async () => {
      outcome = await result.current.createCircle("Bad Circle", "", "u1");
    });

    expect(outcome.error).toEqual(pgError);
  });

  it("createCircle succeeds and refreshes circles list", async () => {
    const newCircle = { id: "c2", name: "New Circle", description: null, invite_code: "xyz", created_by: "u1", created_at: null };

    // mount fetch → empty; insert → success; add member → success; re-fetch → new circle
    mockFrom
      .mockReturnValueOnce(buildChain({ data: [], error: null }))             // initial fetch
      .mockReturnValueOnce(buildChain({ data: newCircle, error: null }))      // insert circle
      .mockReturnValueOnce(buildChain({ data: null, error: null }))            // add owner member
      .mockReturnValueOnce(buildChain({ data: [{ circles: newCircle }], error: null })); // re-fetch

    const { result } = renderHook(() => useCircles("u1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let outcome: any;
    await act(async () => {
      outcome = await result.current.createCircle("New Circle", "", "u1");
    });

    expect(outcome.error).toBeUndefined();
    expect(result.current.circles).toHaveLength(1);
    expect(result.current.circles[0].name).toBe("New Circle");
  });

  it("joinCircle returns error for invalid invite code", async () => {
    const pgError = { message: "No rows returned" };

    mockFrom
      .mockReturnValueOnce(buildChain({ data: [], error: null }))   // mount fetch
      .mockReturnValueOnce(buildChain({ data: null, error: pgError })); // lookup by invite_code

    const { result } = renderHook(() => useCircles("u1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let outcome: any;
    await act(async () => {
      outcome = await result.current.joinCircle("BADCODE", "u1");
    });

    expect(outcome.error).toBeTruthy();
  });
});
