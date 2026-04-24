import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/lib/firestore";

const STYLES: Record<AppointmentStatus, string> = {
  confirmed: "bg-success/15 text-success border-success/30",
  pending: "bg-warning/20 text-warning-foreground border-warning/40",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        STYLES[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
