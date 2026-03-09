import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Save, Loader2, Lock, Eye, EyeOff } from "lucide-react";

export default function SettingsPage() {
  const { user, profile } = useAuthContext();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState("");
  const [pwError, setPwError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage("");
    setError("");

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, username })
      .eq("id", user.id);

    if (error) setError(error.message);
    else setMessage("Profile saved!");
    setSaving(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwMessage("");
    if (newPassword.length < 6) {
      setPwError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords don't match.");
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setPwError(error.message);
    else {
      setPwMessage("Password updated!");
      setNewPassword("");
      setConfirmPassword("");
    }
    setPwSaving(false);
  }

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your profile</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="Avatar" className="w-14 h-14 rounded-full object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-2xl text-primary-foreground font-bold">
            {(profile?.display_name || profile?.username || "?")[0].toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-semibold text-foreground">{profile?.display_name || profile?.username}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      {/* Profile form */}
      <form onSubmit={handleSave} className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Profile Info</h2>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Display Name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        {message && <p className="text-accent text-xs bg-accent/10 rounded-lg px-3 py-2">{message}</p>}
        {error && <p className="text-destructive text-xs bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 gradient-primary rounded-lg text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </form>

      {/* Password change form */}
      <form onSubmit={handlePasswordChange} className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Change Password</h2>
        </div>
        <div className="relative">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">New Password</label>
          <input
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 6 characters"
            className="w-full px-3 py-2 pr-10 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            required
          />
          <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 bottom-2 text-muted-foreground hover:text-foreground transition-colors">
            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="relative">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Confirm Password</label>
          <input
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            className="w-full px-3 py-2 pr-10 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            required
          />
          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 bottom-2 text-muted-foreground hover:text-foreground transition-colors">
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {pwMessage && <p className="text-accent text-xs bg-accent/10 rounded-lg px-3 py-2">{pwMessage}</p>}
        {pwError && <p className="text-destructive text-xs bg-destructive/10 rounded-lg px-3 py-2">{pwError}</p>}
        <button
          type="submit"
          disabled={pwSaving}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground font-medium text-sm hover:border-primary/50 transition-all disabled:opacity-50"
        >
          {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          Update Password
        </button>
      </form>
    </div>
  );
}
