import { Users } from "lucide-react";

interface PresenceBadgeProps {
  count: number;
  onlineUsers?: Array<{ user_id?: string; display_name?: string }>;
}

export default function PresenceBadge({ count, onlineUsers = [] }: PresenceBadgeProps) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex items-center">
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse-glow" />
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Users className="w-3 h-3" />
        <span>{count} online</span>
      </div>
      {onlineUsers.slice(0, 3).map((u, i) => (
        <div
          key={i}
          className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center text-[9px] text-primary-foreground font-bold border border-background"
          title={u.display_name}
          style={{ marginLeft: i > 0 ? "-4px" : 0 }}
        >
          {(u.display_name || "?")[0].toUpperCase()}
        </div>
      ))}
      {onlineUsers.length > 3 && (
        <span className="text-xs text-muted-foreground">+{onlineUsers.length - 3}</span>
      )}
    </div>
  );
}
