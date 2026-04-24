import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  CalendarCheck,
  Clock,
  Users,
  MessageSquare,
  Plus,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { where } from "firebase/firestore";
import {
  getCollectionCount,
  getCollectionPage,
  type Appointment,
} from "@/lib/firestore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const [stats, setStats] = useState({
    today: 0,
    total: 0,
    pending: 0,
    inquiries: 0,
  });
  const [recent, setRecent] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);

        // Parallel queries for better performance
        const [total, todayCount, pending, inquiries, recentResult] =
          await Promise.all([
            getCollectionCount("appointments"),
            getCollectionCount("appointments", [
              where("appointmentDate", "==", today),
            ]),
            getCollectionCount("appointments", [
              where("status", "==", "pending"),
            ]),
            getCollectionCount("inquiries"),
            getCollectionPage<Appointment>("appointments", 5),
          ]);

        if (!active) return;

        setStats({
          today: todayCount,
          total,
          pending,
          inquiries,
        });
        setRecent(recentResult.data);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  // Memoize cards to prevent unnecessary re-renders
  const cards = useMemo(
    () => [
      {
        label: "Today's Appointments",
        value: stats.today,
        icon: Clock,
        tint: "from-blue-500/10 to-blue-500/5",
      },
      {
        label: "Total Appointments",
        value: stats.total,
        icon: CalendarCheck,
        tint: "from-cyan-500/10 to-cyan-500/5",
      },
      {
        label: "Pending Approval",
        value: stats.pending,
        icon: Users,
        tint: "from-amber-500/10 to-amber-500/5",
      },
      {
        label: "Total Inquiries",
        value: stats.inquiries,
        icon: MessageSquare,
        tint: "from-emerald-500/10 to-emerald-500/5",
      },
    ],
    [stats],
  );

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4">
        <Card className="p-8 rounded-2xl shadow-card border-0 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button className="rounded-xl" asChild>
            <Link to="/appointments">View appointments</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your clinic at a glance.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card
              key={c.label}
              className={`p-5 rounded-2xl border-0 shadow-card bg-gradient-to-br ${c.tint} bg-card`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {c.label}
                  </p>
                  <p className="font-display text-3xl font-bold mt-2">
                    {c.value}
                  </p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-gradient-primary grid place-items-center text-primary-foreground shadow-glow">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 rounded-2xl shadow-card border-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg">
              Recent Appointments
            </h2>
            <Link
              to="/appointments"
              className="text-sm text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="font-medium px-2 py-3">Patient</th>
                  <th className="font-medium px-2 py-3">Date</th>
                  <th className="font-medium px-2 py-3">Time</th>
                  <th className="font-medium px-2 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-2 py-8 text-center text-muted-foreground"
                    >
                      No appointments yet
                    </td>
                  </tr>
                ) : (
                  recent.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="px-2 py-3 font-medium">{a.name}</td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {a.date ? format(new Date(a.date), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {a.time}
                      </td>
                      <td className="px-2 py-3">
                        <StatusBadge status={a.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl shadow-card border-0">
          <h2 className="font-display font-bold text-lg mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Button
              asChild
              className="w-full h-12 rounded-xl bg-gradient-primary justify-start shadow-card"
            >
              <Link to="/blogs">
                <Plus className="h-4 w-4 mr-2" /> Add New Blog
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full h-12 rounded-xl justify-start"
            >
              <Link to="/appointments">
                <CalendarCheck className="h-4 w-4 mr-2" /> View Appointments
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full h-12 rounded-xl justify-start"
            >
              <Link to="/inquiries">
                <MessageSquare className="h-4 w-4 mr-2" /> Patient Inquiries
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
