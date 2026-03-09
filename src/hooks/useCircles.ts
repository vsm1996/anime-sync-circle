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

  async function createCircle(name: string, description: string, createdBy: string) {
    const { data, error } = await supabase
      .from("circles")
      .insert({ name, description, created_by: createdBy })
      .select()
      .single();

    if (error || !data) return { error };

    // Add creator as owner
    await supabase.from("circle_members").insert({
      circle_id: data.id,
      user_id: createdBy,
      role: "owner",
    });

    await fetchCircles();
    return { data };
  }

  async function joinCircle(inviteCode: string, userId: string) {
    const { data: circle, error } = await supabase
      .from("circles")
      .select("id")
      .eq("invite_code", inviteCode)
      .single();

    if (error || !circle) return { error: error || new Error("Invalid invite code") };

    const { error: joinError } = await supabase.from("circle_members").insert({
      circle_id: circle.id,
      user_id: userId,
      role: "member",
    });

    if (joinError) return { error: joinError };
    await fetchCircles();
    return { data: circle };
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
