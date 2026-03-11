import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Circle, CircleMember, Profile } from "@/types";

export function useCircles(userId?: string) {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchCircles();
  }, [userId]);

  async function fetchCircles() {
    setLoading(true);
    const { data } = await supabase
      .from("circle_members")
      .select("circle_id, circles(*)")
      .eq("user_id", userId!);

    if (data) {
      const c = data.map((d: any) => d.circles).filter(Boolean) as Circle[];
      setCircles(c);
    }
    setLoading(false);
  }

  async function createCircle(name: string, description: string) {
    const { data: circleId, error } = await supabase
      .rpc("create_circle", { p_name: name, p_description: description });

    if (error || !circleId) return { error };

    await fetchCircles();
    return { data: circleId };
  }

  async function joinCircle(inviteCode: string, _userId: string) {
    const { data: circleId, error } = await supabase
      .rpc("join_circle_by_invite", { p_invite_code: inviteCode });

    if (error || !circleId) return { error: error || new Error("Invalid invite code") };

    await fetchCircles();
    return { data: { id: circleId } };
  }

  return { circles, loading, createCircle, joinCircle, refetch: fetchCircles };
}

export function useCircleMembers(circleId?: string) {
  const [members, setMembers] = useState<(CircleMember & { profiles: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!circleId) { setLoading(false); return; }
    fetchMembers();
  }, [circleId]);

  async function fetchMembers() {
    const { data } = await supabase
      .from("circle_members")
      .select("*, profiles(*)")
      .eq("circle_id", circleId!);

    if (data) setMembers(data as any);
    setLoading(false);
  }

  return { members, loading, refetch: fetchMembers };
}
