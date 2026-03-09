import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WatchEntry, AnimeCache, WatchStatus } from "@/types";

export function useWatchEntries(userId?: string) {
  const [entries, setEntries] = useState<(WatchEntry & { anime?: AnimeCache })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchEntries();
  }, [userId]);

  async function fetchEntries() {
    setLoading(true);
    const { data } = await supabase
      .from("watch_entries")
      .select("*")
      .eq("user_id", userId!)
      .order("updated_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    // Fetch anime details
    const malIds = [...new Set(data.map((e) => e.mal_id))];
    const { data: animeData } = await supabase
      .from("anime_cache")
      .select("*")
      .in("mal_id", malIds);

    const animeMap = new Map((animeData || []).map((a) => [a.mal_id, a]));
    setEntries(data.map((e) => ({ ...e, anime: animeMap.get(e.mal_id) })) as any);
    setLoading(false);
  }

  async function addEntry(
    userId: string,
    malId: number,
    status: WatchStatus = "plan_to_watch"
  ) {
    const { data, error } = await supabase
      .from("watch_entries")
      .upsert({ user_id: userId, mal_id: malId, status }, { onConflict: "user_id,mal_id" })
      .select()
      .single();
    if (!error) await fetchEntries();
    return { data, error };
  }

  async function updateEntry(
    entryId: string,
    updates: Partial<Pick<WatchEntry, "status" | "episodes_watched" | "rating" | "notes">>
  ) {
    const { error } = await supabase
      .from("watch_entries")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", entryId);
    if (!error) await fetchEntries();
    return { error };
  }

  async function deleteEntry(entryId: string) {
    const { error } = await supabase.from("watch_entries").delete().eq("id", entryId);
    if (!error) await fetchEntries();
    return { error };
  }

  return { entries, loading, addEntry, updateEntry, deleteEntry, refetch: fetchEntries };
}
