import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarCheck,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  Stethoscope,
  Menu,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { NotificationBell } from "@/components/NotificationBell";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/appointments", label: "Appointments", icon: CalendarCheck },
  { to: "/blogs", label: "Blogs", icon: FileText },
  { to: "/inquiries", label: "Inquiries", icon: MessageSquare },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function AuthenticatedLayout() {
  const { user, loading, logout, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && configured && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, configured, navigate]);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-soft">
        <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (configured && !user) return null;

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Signed out");
      navigate({ to: "/login" });
    } catch {
      toast.error("Failed to sign out");
    }
  };

  const SidebarInner = (
    <>
      <div className="px-6 py-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow">
          <Stethoscope className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="font-display font-bold leading-tight">MediCare</p>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
        </div>
      </div>
      <nav className="px-3 flex-1 space-y-1">
        {NAV.map((item) => {
          const active = location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-gradient-primary text-primary-foreground shadow-card"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border flex-col">
        {SidebarInner}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-sidebar border-r border-sidebar-border flex flex-col animate-in slide-in-from-left">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 h-8 w-8 grid place-items-center rounded-lg hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
            {SidebarInner}
          </aside>
        </div>
      )}

      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="hidden sm:block">
                <p className="text-xs text-muted-foreground">
                  {format(new Date(), "EEEE, MMMM d, yyyy")}
                </p>
                <p className="font-display font-semibold text-sm">
                  Welcome back, {user?.email?.split("@")[0] ?? "Admin"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center text-primary-foreground text-sm font-semibold">
                {(user?.email?.[0] ?? "A").toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
