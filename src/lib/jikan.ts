import { supabase } from "@/integrations/supabase/client";
import type { JikanAnime, AnimeCache } from "@/types";

const JIKAN_BASE = "https://api.jikan.moe/v4";

function mapJikanToCache(anime: JikanAnime): AnimeCache {
  return {
    mal_id: anime.mal_id,
    title: anime.title,
    title_english: anime.title_english,
    image_url: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || null,
    episodes: anime.episodes,
    status: anime.status,
    synopsis: anime.synopsis,
    score: anime.score,
    genres: anime.genres?.map((g) => g.name) || [],
    cached_at: new Date().toISOString(),
  };
}

export async function searchAnime(query: string): Promise<JikanAnime[]> {
  const res = await fetch(
    `${JIKAN_BASE}/anime?q=${encodeURIComponent(query)}&limit=12&sfw=true`
  );
  if (!res.ok) throw new Error("Failed to fetch from Jikan API");
  const data = await res.json();
  return data.data || [];
}

export async function getAnimeById(malId: number): Promise<AnimeCache | null> {
  // Check cache first
  const { data: cached } = await supabase
    .from("anime_cache")
    .select("*")
    .eq("mal_id", malId)
    .single();

  if (cached) return cached as AnimeCache;

  // Fetch from Jikan
  const res = await fetch(`${JIKAN_BASE}/anime/${malId}`);
  if (!res.ok) return null;
  const data = await res.json();
  const anime = mapJikanToCache(data.data);

  // Cache it
  await supabase.from("anime_cache").upsert(anime, { onConflict: "mal_id" });

  return anime;
}

export async function cacheAnime(jikanAnime: JikanAnime): Promise<void> {
  const anime = mapJikanToCache(jikanAnime);
  await supabase.from("anime_cache").upsert(anime, { onConflict: "mal_id" });
}
