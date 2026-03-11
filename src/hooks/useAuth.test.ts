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

// vi.hoisted ensures these are defined before the vi.mock factory runs
const { mockUnsubscribe, mockOnAuthStateChange, mockGetSession, mockSignOut } = vi.hoisted(() => ({
  mockUnsubscribe: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockGetSession: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      onAuthStateChange: mockOnAuthStateChange,
      getSession: mockGetSession,
      signOut: mockSignOut,
    },
  },
}));

import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

const mockFrom = vi.mocked(supabase.from);

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

const fakeUser = { id: "u1", email: "alice@example.com" };
const fakeSession = { user: fakeUser, access_token: "tok", refresh_token: "ref" };

function setupNoSession() {
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: mockUnsubscribe } },
  });
  mockGetSession.mockResolvedValue({ data: { session: null } });
}

function setupWithSession() {
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: mockUnsubscribe } },
  });
  mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
  mockFrom.mockReturnValue(buildChain({ data: fakeProfile, error: null }));
}

describe("useAuth", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("starts in loading state", () => {
    setupNoSession();
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
  });

  it("resolves to null state when there is no session", async () => {
    setupNoSession();

    const { result } = renderHook(() => useAuth());
    await pollUntil(() => !result.current.loading);

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("fetches profile and sets user when session exists", async () => {
    setupWithSession();

    const { result } = renderHook(() => useAuth());
    await pollUntil(() => !result.current.loading);

    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.session).toEqual(fakeSession);
    expect(result.current.profile?.username).toBe("alice");
    expect(result.current.loading).toBe(false);
  });

  it("queries profiles table with correct user id", async () => {
    setupWithSession();

    const { result } = renderHook(() => useAuth());
    await pollUntil(() => !result.current.loading);

    expect(mockFrom).toHaveBeenCalledWith("profiles");
    const chain = mockFrom.mock.results[0].value;
    expect(chain.eq).toHaveBeenCalledWith("id", "u1");
    expect(chain.single).toHaveBeenCalled();
  });

  it("profile is null when profile row not found", async () => {
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    mockFrom.mockReturnValue(buildChain({ data: null, error: null }));

    const { result } = renderHook(() => useAuth());
    await pollUntil(() => !result.current.loading);

    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.profile).toBeNull();
  });

  it("updates state when onAuthStateChange fires with a session", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let authCallback: (event: string, session: any) => Promise<void>;
    mockOnAuthStateChange.mockImplementation((cb) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useAuth());
    await pollUntil(() => !result.current.loading);
    expect(result.current.user).toBeNull();

    mockFrom.mockReturnValue(buildChain({ data: fakeProfile, error: null }));

    await act(async () => {
      await authCallback!("SIGNED_IN", fakeSession);
      await new Promise((r) => setTimeout(r, 50)); // let setTimeout(0) inside hook run
    });

    await pollUntil(() => result.current.user !== null);
    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.session).toEqual(fakeSession);
  });

  it("clears state when onAuthStateChange fires with null session (sign out)", async () => {
    // Start with a session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let authCallback: (event: string, session: any) => Promise<void>;
    mockOnAuthStateChange.mockImplementation((cb) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    mockFrom.mockReturnValue(buildChain({ data: fakeProfile, error: null }));

    const { result } = renderHook(() => useAuth());
    await pollUntil(() => result.current.profile !== null);

    // Simulate sign out
    await act(async () => {
      await authCallback!("SIGNED_OUT", null);
    });

    await pollUntil(() => result.current.user === null);
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("signOut delegates to supabase.auth.signOut", async () => {
    setupNoSession();
    mockSignOut.mockResolvedValue({});

    const { result } = renderHook(() => useAuth());
    await pollUntil(() => !result.current.loading);

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it("unsubscribes from auth listener on unmount", async () => {
    setupNoSession();

    const { unmount } = renderHook(() => useAuth());
    await pollUntil(() => !mockGetSession.mock.calls.length === false);

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
