import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------
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
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

import { useCircles, useCircleMembers } from "./useCircles";
import { supabase } from "@/integrations/supabase/client";

const mockFrom = vi.mocked(supabase.from);
const mockRpc = vi.mocked(supabase.rpc);

async function pollUntil(predicate: () => boolean, timeoutMs = 3000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error("Timeout waiting for condition");
    await new Promise((r) => setTimeout(r, 10));
  }
}

const fakeCircle = {
  id: "c1",
  name: "Test Circle",
  description: null,
  invite_code: "abc123",
  created_by: "u1",
  created_at: null,
};

// ---------------------------------------------------------------------------
// useCircles
// ---------------------------------------------------------------------------
describe("useCircles", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("does not fetch when userId is undefined", async () => {
    const { result } = renderHook(() => useCircles(undefined));
    await pollUntil(() => !result.current.loading);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(result.current.circles).toEqual([]);
  });

  it("fetches and returns circles for a given userId", async () => {
    mockFrom.mockReturnValue(buildChain({ data: [{ circles: fakeCircle }], error: null }));

    const { result } = renderHook(() => useCircles("u1"));
    await pollUntil(() => !result.current.loading);

    expect(result.current.circles).toHaveLength(1);
    expect(result.current.circles[0].name).toBe("Test Circle");
    expect(result.current.circles[0].invite_code).toBe("abc123");
  });

  it("returns empty array when data is null", async () => {
    mockFrom.mockReturnValue(buildChain({ data: null, error: null }));

    const { result } = renderHook(() => useCircles("u1"));
    await pollUntil(() => !result.current.loading);

    expect(result.current.circles).toEqual([]);
  });

  it("filters out null circles entries", async () => {
    mockFrom.mockReturnValue(
      buildChain({ data: [{ circles: fakeCircle }, { circles: null }], error: null })
    );

    const { result } = renderHook(() => useCircles("u1"));
    await pollUntil(() => !result.current.loading);

    expect(result.current.circles).toHaveLength(1);
  });

  it("createCircle propagates rpc error", async () => {
    const pgError = { message: "failed to create circle" };
    mockFrom.mockReturnValue(buildChain({ data: [], error: null }));
    mockRpc.mockResolvedValueOnce({ data: null, error: pgError } as any);

    const { result } = renderHook(() => useCircles("u1"));
    await pollUntil(() => !result.current.loading);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let outcome: any;
    await act(async () => {
      outcome = await result.current.createCircle("Bad Circle", "");
    });

    expect(outcome.error).toEqual(pgError);
  });

  it("createCircle succeeds and refreshes circles list", async () => {
    mockFrom
      .mockReturnValueOnce(buildChain({ data: [], error: null }))
      .mockReturnValueOnce(buildChain({ data: [{ circles: fakeCircle }], error: null }));
    mockRpc.mockResolvedValueOnce({ data: "c1", error: null } as any);

    const { result } = renderHook(() => useCircles("u1"));
    await pollUntil(() => !result.current.loading);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let outcome: any;
    await act(async () => {
      outcome = await result.current.createCircle("Test Circle", "");
    });

    expect(outcome.error).toBeUndefined();
    await pollUntil(() => result.current.circles.length === 1);
    expect(result.current.circles[0].name).toBe("Test Circle");
  });

  it("joinCircle returns error for invalid invite code", async () => {
    const pgError = { message: "invalid_invite_code" };
    mockFrom.mockReturnValue(buildChain({ data: [], error: null }));
    mockRpc.mockResolvedValueOnce({ data: null, error: pgError } as any);

    const { result } = renderHook(() => useCircles("u1"));
    await pollUntil(() => !result.current.loading);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let outcome: any;
    await act(async () => {
      outcome = await result.current.joinCircle("BADCODE", "u1");
    });

    expect(outcome.error).toBeTruthy();
  });

  it("joinCircle returns error when rpc returns null circleId", async () => {
    mockFrom.mockReturnValue(buildChain({ data: [], error: null }));
    mockRpc.mockResolvedValueOnce({ data: null, error: null } as any);

    const { result } = renderHook(() => useCircles("u1"));
    await pollUntil(() => !result.current.loading);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let outcome: any;
    await act(async () => {
      outcome = await result.current.joinCircle("NULLCODE", "u1");
    });

    expect(outcome.error).toBeTruthy();
  });

  it("joinCircle succeeds with valid invite code and refreshes list", async () => {
    mockFrom
      .mockReturnValueOnce(buildChain({ data: [], error: null }))
      .mockReturnValueOnce(buildChain({ data: [{ circles: fakeCircle }], error: null }));
    mockRpc.mockResolvedValueOnce({ data: "c1", error: null } as any);

    const { result } = renderHook(() => useCircles("u1"));
    await pollUntil(() => !result.current.loading);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let outcome: any;
    await act(async () => {
      outcome = await result.current.joinCircle("abc123", "u1");
    });

    expect(outcome.error).toBeUndefined();
    expect(outcome.data).toEqual({ id: "c1" });
    await pollUntil(() => result.current.circles.length === 1);
  });

  it("refetch re-runs the circles query", async () => {
    mockFrom.mockReturnValue(buildChain({ data: [{ circles: fakeCircle }], error: null }));

    const { result } = renderHook(() => useCircles("u1"));
    await pollUntil(() => !result.current.loading);
    expect(mockFrom).toHaveBeenCalledTimes(1);

    await act(async () => { await result.current.refetch(); });
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// useCircleMembers
// ---------------------------------------------------------------------------
describe("useCircleMembers", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("does not fetch when circleId is undefined", async () => {
    const { result } = renderHook(() => useCircleMembers(undefined));
    await pollUntil(() => !result.current.loading);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(result.current.members).toEqual([]);
  });

  it("fetches members with profiles", async () => {
    const fakeMember = {
      circle_id: "c1",
      user_id: "u1",
      role: "owner",
      joined_at: null,
      profiles: {
        id: "u1", username: "user1", display_name: "User One",
        avatar_url: null, created_at: null, updated_at: null,
      },
    };
    mockFrom.mockReturnValue(buildChain({ data: [fakeMember], error: null }));

    const { result } = renderHook(() => useCircleMembers("c1"));
    await pollUntil(() => !result.current.loading);

    expect(result.current.members).toHaveLength(1);
    expect(result.current.members[0].user_id).toBe("u1");
    expect(result.current.members[0].profiles.username).toBe("user1");
    expect(result.current.members[0].role).toBe("owner");
  });

  it("handles multiple members", async () => {
    const members = [
      { circle_id: "c1", user_id: "u1", role: "owner", joined_at: null, profiles: { id: "u1", username: "alice", display_name: null, avatar_url: null, created_at: null, updated_at: null } },
      { circle_id: "c1", user_id: "u2", role: "member", joined_at: null, profiles: { id: "u2", username: "bob", display_name: null, avatar_url: null, created_at: null, updated_at: null } },
    ];
    mockFrom.mockReturnValue(buildChain({ data: members, error: null }));

    const { result } = renderHook(() => useCircleMembers("c1"));
    await pollUntil(() => !result.current.loading);

    expect(result.current.members).toHaveLength(2);
    expect(result.current.members[1].profiles.username).toBe("bob");
  });

  it("returns empty array when data is null", async () => {
    mockFrom.mockReturnValue(buildChain({ data: null, error: null }));

    const { result } = renderHook(() => useCircleMembers("c1"));
    await pollUntil(() => !result.current.loading);

    expect(result.current.members).toEqual([]);
  });

  it("refetch re-queries members", async () => {
    mockFrom.mockReturnValue(buildChain({ data: [], error: null }));

    const { result } = renderHook(() => useCircleMembers("c1"));
    await pollUntil(() => !result.current.loading);
    expect(mockFrom).toHaveBeenCalledTimes(1);

    await act(async () => { await result.current.refetch(); });
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });
});
