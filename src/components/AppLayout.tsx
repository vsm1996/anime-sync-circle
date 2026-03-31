import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  Search,
  Settings,
  LogOut,
  Play,
  Menu,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/circles", icon: Users, label: "Circles" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

function NavContents({ onNav }: { onNav?: () => void }) {
  const { profile, signOut } = useAuthContext();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
    onNav?.();
  }

  return (
    <>
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
            onClick={onNav}
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
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col border-r border-border bg-sidebar">
        <NavContents />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center gap-3 px-4 border-b border-border bg-sidebar">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button className="text-sidebar-foreground p-1 -ml-1">
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-sidebar flex flex-col border-r border-sidebar-border">
            <NavContents onNav={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
            <Play className="w-3.5 h-3.5 text-primary-foreground fill-current" />
          </div>
          <span className="font-bold text-sidebar-foreground text-sm">Watchlist</span>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto md:pt-0 pt-14">
        {children}
      </main>
    </div>
  );
}
