import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Booking } from "@/types";

const STYLES: Record<Booking["status"], string> = {
  PENDING: "border-warning/40 bg-warning/15 text-amber-800 dark:text-amber-200",
  CONFIRMED: "bg-primary/10 text-primary border-primary/20",
  COMPLETED: "bg-success/15 text-emerald-700 dark:text-emerald-300 border-success/30",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

const LABELS: Record<Booking["status"], string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function StatusBadge({ booking }: { booking: Pick<Booking, "status" | "cancelled_by"> }) {
  let label = LABELS[booking.status];
  if (booking.status === "CANCELLED" && booking.cancelled_by === "PROVIDER") label = "Declined / cancelled by provider";
  if (booking.status === "CANCELLED" && !booking.cancelled_by) label = "Expired";
  return (
    <Badge variant="outline" className={cn("font-medium", STYLES[booking.status])}>
      {label}
    </Badge>
  );
}
