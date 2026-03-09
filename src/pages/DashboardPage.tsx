import { useState, useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useWatchEntries } from "@/hooks/useWatchEntries";
import { useCircles } from "@/hooks/useCircles";
import { useActivityFeed } from "@/hooks/useRealtime";
import AnimeCard from "@/components/AnimeCard";
import ActivityFeed from "@/components/ActivityFeed";
import AnimeSearchModal from "@/components/AnimeSearchModal";
import { cacheAnime } from "@/lib/jikan";
import type { JikanAnime, WatchStatus } from "@/types";
import { Plus, BookOpen, Play, CheckCircle2, Clock, PauseCircle } from "lucide-react";

const STATUS_TABS = [
  { key: "watching", label: "Watching", icon: Play },
  { key: "plan_to_watch", label: "Plan to Watch", icon: BookOpen },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
  { key: "on_hold", label: "On Hold", icon: PauseCircle },
  { key: "dropped", label: "Dropped", icon: Clock },
] as const;

export default function DashboardPage() {
  const { user, profile } = useAuthContext();
  const { entries, loading, addEntry, updateEntry } = useWatchEntries(user?.id);
  const { circles } = useCircles(user?.id);
  const [activeStatus, setActiveStatus] = useState<WatchStatus>("watching");
  const [searchOpen, setSearchOpen] = useState(false);

  // Use first circle for activity feed on dashboard
  const firstCircle = circles[0];
  const { activities, loading: actLoading } = useActivityFeed(firstCircle?.id);

  const filteredEntries = entries.filter((e) => e.status === activeStatus);

  async function handleAddAnime(anime: JikanAnime) {
    if (!user) return;
    await cacheAnime(anime);
    await addEntry(user.id, anime.mal_id, "plan_to_watch");
  }

  const counts = {
    watching: entries.filter((e) => e.status === "watching").length,
    completed: entries.filter((e) => e.status === "completed").length,
    plan_to_watch: entries.filter((e) => e.status === "plan_to_watch").length,
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {profile?.display_name
                ? `Hey, ${profile.display_name.split(" ")[0]} 👋`
                : "My Watchlist"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {counts.watching} watching · {counts.completed} completed · {counts.plan_to_watch} planned
            </p>
          </div>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-4 py-2 gradient-primary rounded-lg text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-glow"
          >
            <Plus className="w-4 h-4" />
            Add Anime
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Watchlist panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-auto">
          {/* Status tabs */}
          <div className="flex gap-1 px-6 pt-4 overflow-x-auto">
            {STATUS_TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveStatus(key as WatchStatus)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeStatus === key
                    ? "gradient-primary text-primary-foreground shadow-glow"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {entries.filter((e) => e.status === key).length > 0 && (
                  <span className={`ml-1 ${activeStatus === key ? "opacity-70" : "opacity-50"}`}>
                    {entries.filter((e) => e.status === key).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Anime grid */}
          <div className="p-6">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
                    <div className="h-44 bg-muted" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="h-2.5 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium">Nothing here yet</p>
                <p className="text-muted-foreground text-sm mt-1">
                  {activeStatus === "watching"
                    ? "Start watching something!"
                    : `No anime in your ${activeStatus.replace(/_/g, " ")} list`}
                </p>
                <button
                  onClick={() => setSearchOpen(true)}
                  className="mt-4 px-4 py-2 gradient-primary rounded-lg text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Search Anime
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredEntries.map((entry) => (
                  <AnimeCard
                    key={entry.id}
                    entry={entry}
                    anime={entry.anime}
                    onUpdateStatus={(status) => updateEntry(entry.id, { status })}
                    onUpdateEpisodes={(ep) => updateEntry(entry.id, { episodes_watched: ep })}
                    onRate={(rating) => updateEntry(entry.id, { rating })}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity feed sidebar */}
        {firstCircle && (
          <div className="w-72 flex-shrink-0 border-l border-border overflow-auto">
            <div className="px-4 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">Circle Activity</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{firstCircle.name}</p>
            </div>
            <div className="px-4 py-3">
              <ActivityFeed activities={activities} loading={actLoading} />
            </div>
          </div>
        )}
      </div>

      <AnimeSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={handleAddAnime}
      />
    </div>
  );
}
