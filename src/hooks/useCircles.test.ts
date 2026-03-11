import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockEq = vi.fn();

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  eq: mockEq,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mockFrom },
}));

import { useCircles } from "./useCircles";
import { renderHook, act, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Helper: chain builder that always returns the same terminal promise
// ---------------------------------------------------------------------------
function buildChain(resolveWith: unknown) {
  const chain: Record<string, unknown> = {};
  const terminal = Promise.resolve(resolveWith);
  ["select", "insert", "eq", "single"].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  // Make the chain itself thenable so `await chain` resolves
  (chain as any).then = (res: (v: unknown) => unknown) => terminal.then(res);
  return chain;
}

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

  it("fetches circles for a given userId", async () => {
    const fakeCircle = { id: "c1", name: "Test Circle", description: null, invite_code: "abc123", created_by: "u1", created_at: null };
    const chain = buildChain({ data: [{ circles: fakeCircle }], error: null });

    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useCircles("u1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.circles).toHaveLength(1);
    expect(result.current.circles[0].name).toBe("Test Circle");
  });

  it("returns empty array when data is null", async () => {
    const chain = buildChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useCircles("u1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.circles).toEqual([]);
  });

  it("createCircle returns error on insert failure", async () => {
    const pgError = { message: "duplicate key value violates unique constraint" };

    // First call: fetchCircles on mount – return empty list
    const fetchChain = buildChain({ data: [], error: null });
    // Second call: insert circle – return error
    const insertChain = buildChain({ data: null, error: pgError });

    mockFrom
      .mockReturnValueOnce(fetchChain)  // initial fetchCircles
      .mockReturnValueOnce(insertChain); // createCircle insert

    const { result } = renderHook(() => useCircles("u1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.createCircle("Bad Circle", "", "u1");
    });

    expect((outcome as any).error).toEqual(pgError);
  });

  it("joinCircle returns error for invalid invite code", async () => {
    const pgError = { message: "No rows returned" };

    const fetchChain = buildChain({ data: [], error: null });
    const lookupChain = buildChain({ data: null, error: pgError });

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(lookupChain);

    const { result } = renderHook(() => useCircles("u1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.joinCircle("BADCODE", "u1");
    });

    expect((outcome as any).error).toBeTruthy();
  });
});
