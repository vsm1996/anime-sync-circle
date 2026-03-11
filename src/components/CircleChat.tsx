import { useEffect, useRef, useState } from "react";
import { Send, Wifi, WifiOff } from "lucide-react";
import { usePartyChat, type ChatMessage } from "@/hooks/usePartyChat";

interface Props {
  circleId: string;
  user: { id: string; username: string; avatar_url: string | null } | null;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ msg }: { msg: ChatMessage }) {
  if (msg.avatarUrl) {
    return (
      <img
        src={msg.avatarUrl}
        alt={msg.username}
        className="w-7 h-7 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-xs text-primary-foreground font-bold flex-shrink-0">
      {msg.username[0].toUpperCase()}
    </div>
  );
}

export default function CircleChat({ circleId, user }: Props) {
  const { messages, sendMessage, connected } = usePartyChat(circleId, user);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <Send className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium text-sm">No messages yet</p>
            <p className="text-muted-foreground text-xs mt-1">Say hello to your circle!</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.userId === user?.id;
          const showHeader =
            i === 0 || messages[i - 1].userId !== msg.userId;

          return (
            <div key={msg.id} className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
              {/* Avatar — only on first message in a run */}
              <div className="flex-shrink-0 mt-0.5">
                {showHeader ? (
                  <Avatar msg={msg} />
                ) : (
                  <div className="w-7" />
                )}
              </div>

              <div className={`flex flex-col max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
                {showHeader && (
                  <span className="text-xs text-muted-foreground mb-0.5 px-1">
                    {isOwn ? "You" : msg.username}
                  </span>
                )}
                <div
                  className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                    isOwn
                      ? "gradient-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                  {formatTime(msg.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={connected ? "Send a message..." : "Connecting..."}
              disabled={!connected || !user}
              maxLength={500}
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 pr-8"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {connected ? (
                <Wifi className="w-3.5 h-3.5 text-accent opacity-60" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || !connected || !user}
            className="p-2.5 gradient-primary rounded-xl text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 flex-shrink-0 shadow-glow"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
