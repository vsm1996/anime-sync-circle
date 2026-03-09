import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SharedWatchlistItem, AnimeCache, Profile } from "@/types";

export function useSharedWatchlist(circleId?: string, userId?: string) {
  const [items, setItems] = useState<SharedWatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!circleId) { setLoading(false); return; }
    fetchItems();
  }, [circleId]);

  async function fetchItems() {
    setLoading(true);
    const { data } = await supabase
      .from("shared_watchlists")
      .select("*")
      .eq("circle_id", circleId!)
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
  }

  async function addToWatchlist(malId: number, addedBy: string) {
    const { error } = await supabase.from("shared_watchlists").upsert(
      { circle_id: circleId, mal_id: malId, added_by: addedBy },
      { onConflict: "circle_id,mal_id" }
    );
    if (!error) await fetchItems();
    return { error };
  }

  async function removeFromWatchlist(itemId: string) {
    const { error } = await supabase
      .from("shared_watchlists")
      .delete()
      .eq("id", itemId);
    if (!error) await fetchItems();
    return { error };
  }

  async function vote(watchlistId: string, voteValue: 1 | -1, userId: string) {
    const existingItem = items.find((i) => i.id === watchlistId);
    const currentVote = existingItem?.userVote;

    if (currentVote === voteValue) {
      // Remove vote
      await supabase
        .from("watchlist_votes")
        .delete()
        .eq("watchlist_id", watchlistId)
        .eq("user_id", userId);

      await supabase
        .from("shared_watchlists")
        .update({ votes: (existingItem?.votes || 0) - voteValue })
        .eq("id", watchlistId);
    } else {
      // Add/change vote
      await supabase.from("watchlist_votes").upsert(
        { watchlist_id: watchlistId, user_id: userId, vote: voteValue },
        { onConflict: "watchlist_id,user_id" }
      );

      const delta = currentVote ? voteValue - currentVote : voteValue;
      await supabase
        .from("shared_watchlists")
        .update({ votes: (existingItem?.votes || 0) + delta })
        .eq("id", watchlistId);
    }

    await fetchItems();
  }

  return { items, loading, addToWatchlist, removeFromWatchlist, vote, refetch: fetchItems };
}
