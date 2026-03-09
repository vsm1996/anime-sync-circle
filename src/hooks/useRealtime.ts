import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ActivityLog, AnimeCache, Profile } from "@/types";

export function useActivityFeed(circleId?: string) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!circleId) { setLoading(false); return; }
    fetchActivities();
    subscribeRealtime();
    return () => { channelRef.current?.unsubscribe(); };
  }, [circleId]);

  async function fetchActivities() {
    const { data } = await supabase
      .from("activity_log")
      .select("*")
      .eq("circle_id", circleId!)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!data) { setLoading(false); return; }
    await enrichActivities(data);
    setLoading(false);
  }

  async function enrichActivities(data: any[]) {
    const userIds = [...new Set(data.map((a) => a.user_id).filter(Boolean))];
    const malIds = [...new Set(data.map((a) => a.mal_id).filter(Boolean))];

    const [{ data: profiles }, { data: animes }] = await Promise.all([
      userIds.length
        ? supabase.from("profiles").select("*").in("id", userIds)
        : Promise.resolve({ data: [] }),
      malIds.length
        ? supabase.from("anime_cache").select("*").in("mal_id", malIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap = new Map((profiles || []).map((p: Profile) => [p.id, p]));
    const animeMap = new Map((animes || []).map((a: AnimeCache) => [a.mal_id, a]));

    setActivities(
      data.map((a) => ({
        ...a,
        profile: profileMap.get(a.user_id),
        anime: animeMap.get(a.mal_id),
      })) as ActivityLog[]
    );
  }

  function subscribeRealtime() {
    channelRef.current = supabase
      .channel(`activity-${circleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_log",
          filter: `circle_id=eq.${circleId}`,
        },
        () => fetchActivities()
      )
      .subscribe();
  }

  async function logActivity(
    userId: string,
    action: string,
    malId?: number,
    metadata?: Record<string, unknown>
  ) {
    await supabase.from("activity_log").insert({
      user_id: userId,
      circle_id: circleId,
      action,
      mal_id: malId,
      metadata: metadata || {},
    });
  }

  return { activities, loading, logActivity, refetch: fetchActivities };
}

export function usePresence(circleId?: string, userId?: string, displayName?: string) {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, unknown>[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!circleId || !userId) return;

    channelRef.current = supabase.channel(`presence-${circleId}`, {
      config: { presence: { key: userId } },
    });

    channelRef.current
      .on("presence", { event: "sync" }, () => {
        const state = channelRef.current?.presenceState() || {};
        setOnlineUsers(Object.values(state).flat());
      })
      .on("presence", { event: "join" }, () => {
        const state = channelRef.current?.presenceState() || {};
        setOnlineUsers(Object.values(state).flat());
      })
      .on("presence", { event: "leave" }, () => {
        const state = channelRef.current?.presenceState() || {};
        setOnlineUsers(Object.values(state).flat());
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channelRef.current?.track({
            user_id: userId,
            display_name: displayName || "Unknown",
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => { channelRef.current?.unsubscribe(); };
  }, [circleId, userId, displayName]);

  return { onlineUsers, onlineCount: onlineUsers.length };
}
