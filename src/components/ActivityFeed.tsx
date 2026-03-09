import { formatDistanceToNow } from "date-fns";
import { Tv, Star, ChevronRight, ThumbsUp, Clock } from "lucide-react";
import type { ActivityLog, ActivityAction } from "@/types";

const ACTION_LABELS: Record<ActivityAction, (metadata: any) => string> = {
  started_watching: () => "started watching",
  finished_episode: (m) => `watched episode ${m?.episode}`,
  completed: () => "completed",
  rated: (m) => `rated ${m?.rating}/10`,
  added_to_queue: () => "added to circle watchlist",
  voted: (m) => `${m?.vote > 0 ? "upvoted" : "downvoted"}`,
  dropped: () => "dropped",
  on_hold: () => "put on hold",
};

interface ActivityFeedProps {
  activities: ActivityLog[];
  loading: boolean;
}

export default function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-2.5 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
        <p className="text-muted-foreground text-sm">No activity yet</p>
        <p className="text-muted-foreground text-xs mt-1">
          Activity will appear when circle members update their lists
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {activities.map((activity) => {
        const actionFn = ACTION_LABELS[activity.action as ActivityAction];
        const actionLabel = actionFn
          ? actionFn(activity.metadata)
          : activity.action.replace(/_/g, " ");

        const name =
          activity.profile?.display_name ||
          activity.profile?.username ||
          "Someone";
        const animeName =
          activity.anime?.title_english ||
          activity.anime?.title ||
          (activity.mal_id ? `Anime #${activity.mal_id}` : null);

        return (
          <div
            key={activity.id}
            className="flex items-start gap-3 py-3 border-b border-border last:border-0 animate-fade-in"
          >
            {/* Avatar */}
            {activity.profile?.avatar_url ? (
              <img
                src={activity.profile.avatar_url}
                alt={name}
                className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5"
              />
            ) : (
              <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-xs text-primary-foreground font-bold flex-shrink-0 mt-0.5">
                {name[0].toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-relaxed">
                <span className="font-medium">{name}</span>{" "}
                <span className="text-muted-foreground">{actionLabel}</span>
                {animeName && (
                  <>
                    {" "}
                    <span className="font-medium text-primary">{animeName}</span>
                  </>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activity.created_at
                  ? formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })
                  : "just now"}
              </p>
            </div>

            {activity.anime?.image_url && (
              <img
                src={activity.anime.image_url}
                alt={animeName || ""}
                className="w-8 h-11 object-cover rounded flex-shrink-0"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
