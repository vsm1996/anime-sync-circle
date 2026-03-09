import { useState } from "react";
import { Plus, Star, ChevronUp, ChevronDown, Tv, CheckCircle } from "lucide-react";
import type { WatchEntry, AnimeCache, WatchStatus } from "@/types";

const STATUS_LABELS: Record<WatchStatus, string> = {
  watching: "Watching",
  completed: "Completed",
  dropped: "Dropped",
  plan_to_watch: "Plan to Watch",
  on_hold: "On Hold",
};

const STATUS_COLORS: Record<WatchStatus, string> = {
  watching: "bg-primary/20 text-primary border-primary/30",
  completed: "bg-accent/20 text-accent border-accent/30",
  dropped: "bg-destructive/20 text-destructive border-destructive/30",
  plan_to_watch: "bg-muted text-muted-foreground border-border",
  on_hold: "bg-secondary/20 text-secondary border-secondary/30",
};

interface AnimeCardProps {
  entry: WatchEntry;
  anime?: AnimeCache;
  onUpdateStatus: (status: WatchStatus) => void;
  onUpdateEpisodes: (ep: number) => void;
  onRate: (rating: number) => void;
}

export default function AnimeCard({
  entry,
  anime,
  onUpdateStatus,
  onUpdateEpisodes,
  onRate,
}: AnimeCardProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const status = (entry.status || "watching") as WatchStatus;
  const totalEps = anime?.episodes;
  const watchedEps = entry.episodes_watched || 0;
  const progress = totalEps ? Math.min((watchedEps / totalEps) * 100, 100) : 0;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden anime-card-hover shadow-card group">
      {/* Cover image */}
      <div className="relative h-44 overflow-hidden">
        {anime?.image_url ? (
          <img
            src={anime.image_url}
            alt={anime.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full gradient-primary flex items-center justify-center">
            <Tv className="w-12 h-12 text-primary-foreground/50" />
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[status]}`}
          >
            {STATUS_LABELS[status]}
          </button>
          {showStatusMenu && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 min-w-[140px] overflow-hidden">
              {(Object.entries(STATUS_LABELS) as [WatchStatus, string][]).map(([s, label]) => (
                <button
                  key={s}
                  onClick={() => { onUpdateStatus(s); setShowStatusMenu(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors ${s === status ? "text-primary" : "text-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Score */}
        {anime?.score && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-full px-2 py-0.5">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-medium text-foreground">{anime.score}</span>
          </div>
        )}
        {/* Progress bar */}
        {totalEps && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-background/50">
            <div
              className="h-full gradient-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3">
        <h3 className="font-semibold text-foreground text-sm leading-tight mb-1 line-clamp-1">
          {anime?.title_english || anime?.title || `MAL #${entry.mal_id}`}
        </h3>

        {/* Episode counter */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">
            {watchedEps}{totalEps ? `/${totalEps}` : ""} eps
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onUpdateEpisodes(Math.max(0, watchedEps - 1))}
              className="w-5 h-5 flex items-center justify-center rounded bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => onUpdateEpisodes(totalEps ? Math.min(totalEps, watchedEps + 1) : watchedEps + 1)}
              className="w-5 h-5 flex items-center justify-center rounded gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            {totalEps && watchedEps === totalEps && status !== "completed" && (
              <button
                onClick={() => onUpdateStatus("completed")}
                className="w-5 h-5 flex items-center justify-center rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
                title="Mark completed"
              >
                <CheckCircle className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Rating */}
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => onRate(star * 2)}
              className="p-0.5"
            >
              <Star
                className={`w-3 h-3 transition-colors ${
                  (entry.rating || 0) >= star * 2
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
