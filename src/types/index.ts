export type WatchStatus = 'watching' | 'completed' | 'dropped' | 'plan_to_watch' | 'on_hold';
export type CircleRole = 'owner' | 'admin' | 'member';
export type WatchlistStatus = 'queued' | 'watching' | 'completed';

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Circle {
  id: string;
  name: string;
  description: string | null;
  invite_code: string | null;
  created_by: string | null;
  created_at: string | null;
}

export interface CircleMember {
  circle_id: string;
  user_id: string;
  role: CircleRole | null;
  joined_at: string | null;
  profiles?: Profile;
}

export interface AnimeCache {
  mal_id: number;
  title: string;
  title_english: string | null;
  image_url: string | null;
  episodes: number | null;
  status: string | null;
  synopsis: string | null;
  score: number | null;
  genres: string[] | null;
  cached_at: string | null;
}

export interface WatchEntry {
  id: string;
  user_id: string | null;
  mal_id: number;
  status: WatchStatus | null;
  episodes_watched: number | null;
  rating: number | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string | null;
  created_at: string | null;
  anime?: AnimeCache;
}

export interface SharedWatchlistItem {
  id: string;
  circle_id: string | null;
  mal_id: number;
  added_by: string | null;
  priority: number | null;
  status: WatchlistStatus | null;
  votes: number | null;
  created_at: string | null;
  anime?: AnimeCache;
  userVote?: number | null;
  addedByProfile?: Profile;
}

export interface WatchlistVote {
  watchlist_id: string;
  user_id: string;
  vote: number | null;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  circle_id: string | null;
  action: string;
  mal_id: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  profile?: Profile;
  anime?: AnimeCache;
}

export interface JikanAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  images: {
    jpg: { image_url: string; large_image_url: string };
  };
  episodes: number | null;
  status: string;
  synopsis: string | null;
  score: number | null;
  genres: Array<{ name: string }>;
}

export type ActivityAction =
  | 'started_watching'
  | 'finished_episode'
  | 'completed'
  | 'rated'
  | 'added_to_queue'
  | 'voted'
  | 'dropped'
  | 'on_hold';
