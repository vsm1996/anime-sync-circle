import React, { useState, useEffect } from "react";
import { useParams, useNavigate, NavLink } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSharedWatchlist } from "@/hooks/useSharedWatchlist";
import { useActivityFeed, usePresence } from "@/hooks/useRealtime";
import { useCircleMembers } from "@/hooks/useCircles";
import ActivityFeed from "@/components/ActivityFeed";
import PresenceBadge from "@/components/PresenceBadge";
import AnimeSearchModal from "@/components/AnimeSearchModal";
import CircleChat from "@/components/CircleChat";
import { supabase } from "@/integrations/supabase/client";
import { cacheAnime } from "@/lib/jikan";
import type { Circle, JikanAnime } from "@/types";
import {
  ArrowLeft,
  List,
  Users,
  Clock,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Hash,
  Copy,
  Check,
  MessageCircle,
} from "lucide-react";

type CircleTab = "watchlist" | "activity" | "members" | "chat";

export default function CircleDetailPage() {
  const { circleId } = useParams<{ circleId: string }>();
  const { user, profile } = useAuthContext();
  const navigate = useNavigate();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [activeTab, setActiveTab] = useState<CircleTab>("watchlist");
  const [searchOpen, setSearchOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { items, loading: wlLoading, addToWatchlist, removeFromWatchlist, vote } =
    useSharedWatchlist(circleId, user?.id);
  const { activities, loading: actLoading } = useActivityFeed(circleId);
  const { members, loading: membersLoading } = useCircleMembers(circleId);
  const { onlineUsers, onlineCount } = usePresence(
    circleId,
    user?.id,
    profile?.display_name || profile?.username
  );

  useEffect(() => {
    if (!circleId) return;
    supabase
      .from("circles")
      .select("*")
      .eq("id", circleId)
      .single()
      .then(({ data }) => setCircle(data as Circle));
  }, [circleId]);

  async function handleAddAnime(anime: JikanAnime) {
    if (!user || !circleId) return;
    await cacheAnime(anime);
    await addToWatchlist(anime.mal_id, user.id);
  }

  function copyCode() {
    if (circle?.invite_code) {
      navigator.clipboard.writeText(circle.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const tabs: { key: CircleTab; label: string; icon: React.ElementType }[] = [
    { key: "watchlist", label: "Watchlist", icon: List },
    { key: "chat", label: "Chat", icon: MessageCircle },
    { key: "activity", label: "Activity", icon: Clock },
    { key: "members", label: "Members", icon: Users },
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate("/circles")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground truncate">
                {circle?.name || "Circle"}
              </h1>
              <PresenceBadge count={onlineCount} onlineUsers={onlineUsers as any[]} />
            </div>
            {circle?.description && (
              <p className="text-xs text-muted-foreground truncate">{circle.description}</p>
            )}
          </div>
          {circle?.invite_code && (
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Hash className="w-3 h-3" />
              <code>{circle.invite_code}</code>
              {copied ? <Check className="w-3 h-3 text-accent" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === key
                  ? "gradient-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 ${activeTab === "chat" ? "overflow-hidden" : "overflow-auto p-6"}`}>
        {/* Watchlist tab */}
        {activeTab === "watchlist" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{items.length} anime in queue</p>
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 gradient-primary rounded-lg text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity shadow-glow"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Anime
              </button>
            </div>

            {wlLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-3 animate-pulse flex gap-3">
                    <div className="w-12 h-16 bg-muted rounded" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3.5 bg-muted rounded w-1/2" />
                      <div className="h-2.5 bg-muted rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <List className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground text-sm">No anime queued yet</p>
                <button
                  onClick={() => setSearchOpen(true)}
                  className="mt-3 px-4 py-2 gradient-primary rounded-lg text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Add the first one
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 hover:border-border/80 transition-all shadow-card"
                  >
                    {/* Rank */}
                    <span className="text-lg font-bold text-muted-foreground w-7 text-center flex-shrink-0">
                      {idx + 1}
                    </span>

                    {/* Cover */}
                    {item.anime?.image_url ? (
                      <img
                        src={item.anime.image_url}
                        alt={item.anime.title}
                        className="w-12 h-16 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-muted rounded flex-shrink-0" />
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">
                        {item.anime?.title_english || item.anime?.title || `MAL #${item.mal_id}`}
                      </p>
                      {item.anime?.episodes && (
                        <p className="text-xs text-muted-foreground">{item.anime.episodes} eps</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Added by{" "}
                        <span className="text-foreground">
                          {item.addedByProfile?.display_name ||
                            item.addedByProfile?.username ||
                            "someone"}
                        </span>
                      </p>
                    </div>

                    {/* Vote */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => user && vote(item.id, 1, user.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          item.userVote === 1
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <span
                        className={`text-sm font-bold ${
                          (item.votes || 0) > 0
                            ? "text-primary"
                            : (item.votes || 0) < 0
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {item.votes || 0}
                      </span>
                      <button
                        onClick={() => user && vote(item.id, -1, user.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          item.userVote === -1
                            ? "bg-destructive/20 text-destructive"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Remove */}
                    {(item.added_by === user?.id) && (
                      <button
                        onClick={() => removeFromWatchlist(item.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat tab */}
        {activeTab === "chat" && circleId && (
          <CircleChat
            circleId={circleId}
            user={profile ? { id: user!.id, username: profile.username, avatar_url: profile.avatar_url } : null}
          />
        )}

        {/* Activity tab */}
        {activeTab === "activity" && (
          <ActivityFeed activities={activities} loading={actLoading} />
        )}

        {/* Members tab */}
        {activeTab === "members" && (
          <div className="space-y-2">
            {membersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-muted" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-muted rounded w-1/3" />
                      <div className="h-2.5 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              members.map((member) => {
                const isOnline = onlineUsers.some(
                  (u: any) => u.user_id === member.user_id
                );
                return (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl"
                  >
                    <div className="relative">
                      {member.profiles?.avatar_url ? (
                        <img
                          src={member.profiles.avatar_url}
                          alt={member.profiles.display_name || ""}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs text-primary-foreground font-bold">
                          {(member.profiles?.display_name || member.profiles?.username || "?")[0].toUpperCase()}
                        </div>
                      )}
                      {isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent border-2 border-card" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.profiles?.display_name || member.profiles?.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{member.profiles?.username} · {member.role}
                      </p>
                    </div>
                    {isOnline && (
                      <div className="w-2 h-2 rounded-full bg-accent animate-pulse-glow" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <AnimeSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={handleAddAnime}
        buttonLabel="Add to Watchlist"
      />
    </div>
  );
}
