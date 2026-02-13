import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  Brain, LayoutDashboard, User, Mic, Code, FileText,
  Briefcase, BarChart3, LogOut, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Interviews", href: "/interviews", icon: Mic },
  { label: "Coding", href: "/coding", icon: Code },
  { label: "Resume", href: "/resume", icon: FileText },
  { label: "Jobs", href: "/jobs", icon: Briefcase },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Profile", href: "/profile", icon: User },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// ... imports
import { ModeToggle } from "@/components/mode-toggle";
import { useTheme } from "@/components/theme-provider";

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useAuth();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  // Enforce dark mode on dashboard by default if not set
  useEffect(() => {
    // We only enforce it once per session or if it's explicitly 'light' when entering
    // However, user might want to toggle it back. 
    // The requirement says "when we go there by default dark mode".
    // We'll set it to dark if the current theme is light.
    if (theme === 'light') {
      setTheme('dark');
    }
  }, []); // Run once on mount

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar shadow-2xl transition-transform md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-20 items-center justify-between gap-3 border-b border-sidebar-border px-6 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary/20 shadow-inner ring-1 ring-sidebar-ring/10">
              <Brain className="h-6 w-6 text-sidebar-primary" />
            </div>
            <span className="bg-gradient-to-r from-teal-400 to-sidebar-primary bg-clip-text text-xl font-bold text-transparent tracking-tight">
              HireSense AI
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ease-in-out",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-4 border-sidebar-primary shadow-lg shadow-sidebar-primary/10"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:pl-5 hover:translate-x-1"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
                    active ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-primary"
                  )}
                />
                {item.label}
                {active && (
                  <div className="ml-auto">
                    <div className="h-2 w-2 rounded-full bg-sidebar-primary shadow-[0_0_10px_rgba(45,212,191,0.5)] animate-pulse" />
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4 bg-sidebar/50 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between px-2">
            <span className="text-xs font-semibold uppercase text-sidebar-foreground/50">Theme</span>
            <ModeToggle />
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 rounded-xl px-4 py-6 text-sidebar-foreground/70 hover:bg-red-500/10 hover:text-red-400 group transition-all duration-300"
            onClick={() => signOut()}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-accent group-hover:bg-red-500/20 transition-colors">
              <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </div>
            <span className="font-medium">Sign Out</span>
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border/50 px-6 md:px-8 bg-background/50 backdrop-blur-md sticky top-0 z-30">
          <button
            className="text-foreground md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex w-full items-center justify-end gap-4">
            <div className="md:hidden">
              <ModeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-background relative">
          {/* Decorational background elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[100px]" />
            <div className="absolute top-[20%] -left-[10%] w-[30%] h-[30%] rounded-full bg-accent/5 blur-[100px]" />
          </div>
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
