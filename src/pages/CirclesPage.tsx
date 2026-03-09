import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCircles } from "@/hooks/useCircles";
import { Plus, Users, Hash, ArrowRight, Link, Copy, Check } from "lucide-react";

export default function CirclesPage() {
  const { user } = useAuthContext();
  const { circles, loading, createCircle, joinCircle } = useCircles(user?.id);
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSubmitting(true);
    setError("");
    const { error } = await createCircle(name.trim(), description.trim(), user.id);
    if (error) setError(String(error));
    else { setShowCreate(false); setName(""); setDescription(""); }
    setSubmitting(false);
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !inviteCode.trim()) return;
    setSubmitting(true);
    setError("");
    const { error } = await joinCircle(inviteCode.trim(), user.id);
    if (error) setError("Invalid invite code or you're already a member.");
    else { setShowJoin(false); setInviteCode(""); }
    setSubmitting(false);
  }

  function copyInviteCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Circles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Watch together with friends</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowJoin(!showJoin); setShowCreate(false); setError(""); }}
            className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm hover:bg-muted/70 transition-colors"
          >
            <Hash className="w-4 h-4" />
            Join
          </button>
          <button
            onClick={() => { setShowCreate(!showCreate); setShowJoin(false); setError(""); }}
            className="flex items-center gap-2 px-3 py-2 gradient-primary rounded-lg text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-glow"
          >
            <Plus className="w-4 h-4" />
            Create
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-4 mb-5 animate-fade-in">
          <h3 className="font-semibold text-foreground mb-3 text-sm">Create a circle</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              placeholder="Circle name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
            <input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {error && <p className="text-destructive text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 px-3 py-2 bg-muted rounded-lg text-muted-foreground text-sm hover:bg-muted/70 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-3 py-2 gradient-primary rounded-lg text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Circle"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Join form */}
      {showJoin && (
        <div className="bg-card border border-border rounded-xl p-4 mb-5 animate-fade-in">
          <h3 className="font-semibold text-foreground mb-3 text-sm">Join with invite code</h3>
          <form onSubmit={handleJoin} className="space-y-3">
            <input
              placeholder="Enter invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
            {error && <p className="text-destructive text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowJoin(false)}
                className="flex-1 px-3 py-2 bg-muted rounded-lg text-muted-foreground text-sm hover:bg-muted/70 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-3 py-2 gradient-primary rounded-lg text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? "Joining..." : "Join Circle"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Circles list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-muted rounded w-1/3" />
                  <div className="h-2.5 bg-muted rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : circles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium">No circles yet</p>
          <p className="text-muted-foreground text-sm mt-1">
            Create or join a circle to watch with friends
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {circles.map((circle) => (
            <div
              key={circle.id}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all cursor-pointer group shadow-card"
              onClick={() => navigate(`/circles/${circle.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
                  {circle.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground text-sm truncate">{circle.name}</h3>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                  {circle.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{circle.description}</p>
                  )}
                  {circle.invite_code && (
                    <div className="flex items-center gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                      <Hash className="w-3 h-3 text-muted-foreground" />
                      <code className="text-xs text-muted-foreground font-mono">{circle.invite_code}</code>
                      <button
                        onClick={() => copyInviteCode(circle.invite_code!)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy invite code"
                      >
                        {copied === circle.invite_code ? (
                          <Check className="w-3 h-3 text-accent" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
