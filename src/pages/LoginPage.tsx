import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { LogIn, Mail, Lock, Eye, EyeOff, Play, Star, Users, List } from "lucide-react";
import heroImage from "@/assets/hero-anime.jpg";

const FEATURES = [
  { icon: List, label: "Track everything", desc: "Watching, completed, plan to watch" },
  { icon: Users, label: "Watch together", desc: "Circles with real-time presence" },
  { icon: Star, label: "Vote & rank", desc: "Shared queues with community voting" },
];

const QUOTES = [
  { text: "A dropout will beat a genius through hard work.", author: "Rock Lee" },
  { text: "If you don't take risks, you can't create a future.", author: "Monkey D. Luffy" },
  { text: "The only ones who should kill are those prepared to be killed.", author: "Lelouch" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();
  const { user } = useAuthContext();
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  async function handleGoogleSignIn() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google");
    if (result.error) setError(String(result.error));
    setLoading(false);
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    if (isSignUp) {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) setError(error.message);
      else if (data.session) {
        // Auto-confirm is on — session is returned immediately
        navigate("/dashboard", { replace: true });
      } else {
        setMessage("Check your email to confirm your account!");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      // On success, onAuthStateChange in useAuth will update user → useEffect above redirects
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — hero */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        <img
          src={heroImage}
          alt="Anime friends watching together"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-background/10 to-background/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

        {/* Content over hero */}
        <div className="relative z-10 flex flex-col justify-end p-10 pb-12">
          {/* Quote */}
          <div className="mb-8 max-w-sm">
            <p className="text-foreground/90 text-lg font-medium italic leading-relaxed mb-2">
              "{quote.text}"
            </p>
            <p className="text-muted-foreground text-sm">— {quote.author}</p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-col gap-2.5">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 bg-background/40 backdrop-blur-md border border-border/50 rounded-xl px-4 py-3 w-fit">
                <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow">
                  <Icon className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-foreground text-xs font-semibold">{label}</p>
                  <p className="text-muted-foreground text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-[420px] flex-shrink-0 flex flex-col justify-center px-8 py-12 relative">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `repeating-linear-gradient(45deg, hsl(var(--primary)) 0, hsl(var(--primary)) 1px, transparent 0, transparent 50%)`,
          backgroundSize: "24px 24px",
        }} />

        <div className="relative animate-fade-in">
          {/* Logo */}
          <div className="mb-8">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Play className="w-4 h-4 text-primary-foreground fill-current" />
              </div>
              <span className="text-2xl font-black tracking-tight text-foreground">
                Watch<span className="text-primary">list</span>
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              Your anime community hub. Track, share, sync.
            </p>
          </div>

          {/* Japanese decorative text */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs text-muted-foreground/60 tracking-widest font-light">
              アニメリスト
            </span>
            <div className="flex-1 border-t border-border/50" />
          </div>

          {/* Form card */}
          <div>
            <h2 className="text-lg font-bold text-foreground mb-5">
              {isSignUp ? "Join the community" : "Welcome back, otaku"}
            </h2>

            {/* Google */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground hover:border-primary/50 hover:bg-muted/80 transition-all text-sm font-medium mb-4 disabled:opacity-50 group"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 border-t border-border/50" />
              <span className="text-xs text-muted-foreground px-1">or</span>
              <div className="flex-1 border-t border-border/50" />
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <p className="text-destructive text-xs bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}
              {message && (
                <p className="text-accent text-xs bg-accent/10 border border-accent/20 rounded-xl px-3 py-2">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 gradient-primary rounded-xl text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 shadow-glow"
              >
                <LogIn className="w-4 h-4" />
                {loading ? "Loading..." : isSignUp ? "Create account" : "Sign in"}
              </button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-4">
              {isSignUp ? "Already watching with us?" : "New to Watchlist?"}{" "}
              <button
                onClick={() => { setIsSignUp(!isSignUp); setError(""); setMessage(""); }}
                className="text-primary hover:underline font-medium"
              >
                {isSignUp ? "Sign in" : "Join now"}
              </button>
            </p>
          </div>

          {/* Genre tags decorative */}
          <div className="flex flex-wrap gap-1.5 mt-8 opacity-40">
            {["Shonen", "Isekai", "Seinen", "Mecha", "Slice of Life", "Fantasy"].map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 border border-border rounded-full text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
