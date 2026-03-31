import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SharedWatchlistItem, AnimeCache, Profile } from "@/types";

export function useSharedWatchlist(circleId?: string, userId?: string) {
  const [items, setItems] = useState<SharedWatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!circleId) return;
    setLoading(true);
    const { data } = await supabase
      .from("shared_watchlists")
      .select("*")
      .eq("circle_id", circleId)
      .order("votes", { ascending: false });

    if (!data) { setLoading(false); return; }

    const malIds = [...new Set(data.map((i) => i.mal_id))];
    const userIds = [...new Set(data.map((i) => i.added_by).filter(Boolean))];

    const [{ data: animeData }, { data: profileData }, { data: votesData }] =
      await Promise.all([
        supabase.from("anime_cache").select("*").in("mal_id", malIds),
        supabase.from("profiles").select("*").in("id", userIds),
        userId
          ? supabase
              .from("watchlist_votes")
              .select("*")
              .eq("user_id", userId)
              .in("watchlist_id", data.map((i) => i.id))
          : Promise.resolve({ data: [] }),
      ]);

    const animeMap = new Map((animeData || []).map((a) => [a.mal_id, a as AnimeCache]));
    const profileMap = new Map((profileData || []).map((p) => [p.id, p as Profile]));
    const voteMap = new Map(
      (votesData || []).map((v: any) => [v.watchlist_id, v.vote])
    );

    setItems(
      data.map((item) => ({
        ...item,
        anime: animeMap.get(item.mal_id),
        addedByProfile: item.added_by ? profileMap.get(item.added_by) : undefined,
        userVote: voteMap.get(item.id) ?? null,
      })) as SharedWatchlistItem[]
    );
    setLoading(false);
  }, [circleId, userId]);

  useEffect(() => {
    if (!circleId) { setLoading(false); return; }
    fetchItems();
  }, [fetchItems]);

  const addToWatchlist = useCallback(async (malId: number, addedBy: string) => {
    const { error } = await supabase.from("shared_watchlists").upsert(
      { circle_id: circleId, mal_id: malId, added_by: addedBy },
      { onConflict: "circle_id,mal_id" }
    );
    if (!error) await fetchItems();
    return { error };
  }, [circleId, fetchItems]);

  const removeFromWatchlist = useCallback(async (itemId: string) => {
    const { error } = await supabase
      .from("shared_watchlists")
      .delete()
      .eq("id", itemId);
    if (!error) await fetchItems();
    return { error };
  }, [fetchItems]);

  const vote = useCallback(async (watchlistId: string, voteValue: 1 | -1, votingUserId: string) => {
    const existingItem = items.find((i) => i.id === watchlistId);
    const currentVote = existingItem?.userVote;
    const removing = currentVote === voteValue;

    // Optimistic update
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== watchlistId) return item;
        const delta = removing ? -voteValue : currentVote ? voteValue - currentVote : voteValue;
        return {
          ...item,
          votes: (item.votes || 0) + delta,
          userVote: removing ? null : voteValue,
        };
      }).sort((a, b) => (b.votes || 0) - (a.votes || 0))
    );

    if (removing) {
      await supabase
        .from("watchlist_votes")
        .delete()
        .eq("watchlist_id", watchlistId)
        .eq("user_id", votingUserId);

      await supabase
        .from("shared_watchlists")
        .update({ votes: (existingItem?.votes || 0) - voteValue })
        .eq("id", watchlistId);
    } else {
      await supabase.from("watchlist_votes").upsert(
        { watchlist_id: watchlistId, user_id: votingUserId, vote: voteValue },
        { onConflict: "watchlist_id,user_id" }
      );

      const delta = currentVote ? voteValue - currentVote : voteValue;
      await supabase
        .from("shared_watchlists")
        .update({ votes: (existingItem?.votes || 0) + delta })
        .eq("id", watchlistId);
    }
  }, [items]);

  return { items, loading, addToWatchlist, removeFromWatchlist, vote, refetch: fetchItems };
}
