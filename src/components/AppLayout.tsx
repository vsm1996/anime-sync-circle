import { NavLink, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  Search,
  Settings,
  LogOut,
  Play,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/circles", icon: Users, label: "Circles" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuthContext();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-border bg-sidebar">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
              <Play className="w-4 h-4 text-primary-foreground fill-current" />
            </div>
            <span className="font-bold text-sidebar-foreground">Watchlist</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-2 pb-4 border-t border-sidebar-border pt-3">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || profile.username}
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-xs text-primary-foreground font-bold">
                {(profile?.display_name || profile?.username || "?")[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {profile?.display_name || profile?.username}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                @{profile?.username}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
