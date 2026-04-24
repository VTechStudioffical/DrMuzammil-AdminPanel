import { createFileRoute } from "@tanstack/react-router";
import {
  memo,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Calendar,
  Check,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAppointments } from "@/hooks/useAppointments";
import {
  createAppointment,
  deleteAppointment,
  mapFirestoreError,
  updateAppointment,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentFormValues,
  type AppointmentStatus,
} from "@/services/appointmentService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/appointments")({
  component: AppointmentsPage,
});

const PAGE_SIZE = 20;

const INITIAL_FORM: AppointmentFormValues = {
  patientName: "",
  patientEmail: "",
  patientPhone: "",
  hospitalLocation: "Clinic",
  appointmentDate: "",
  appointmentTime: "",
  status: "pending",
};

const buildWhatsAppConfirmLink = (appointment: Appointment) => {
  const message = [
    `Hello ${appointment.patientName},`,
    "",
    "Your appointment with Dr. Muzammil Ambekar has been confirmed.",
    "",
    `Date: ${appointment.appointmentDate}`,
    `Time: ${appointment.appointmentTime}`,
    `Location: ${appointment.hospitalLocation}`,
    "",
    "Thank you for choosing us.",
  ].join("\n");

  const phone = (appointment.patientPhone || "").replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

function AppointmentsPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "all">(
    "all",
  );
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [optimisticDeleted, setOptimisticDeleted] = useState<
    Record<string, Appointment>
  >({});

  const { appointments, error, hasMore, loadMore, loading, totalLoaded } =
    useAppointments({
      search: deferredSearch,
      status: statusFilter,
      pageSize: PAGE_SIZE,
    });

  useEffect(() => {
    const loadedIds = new Set(appointments.map((appointment) => appointment.id));

    setOptimisticDeleted((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([id]) => loadedIds.has(id)),
      );

      return Object.keys(next).length === Object.keys(current).length
        ? current
        : next;
    });
  }, [appointments]);

  const visibleAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) => !(appointment.id in optimisticDeleted),
      ),
    [appointments, optimisticDeleted],
  );

  const saveMutation = useMutation({
    mutationFn: async ({
      appointmentId,
      values,
    }: {
      appointmentId?: string;
      values: AppointmentFormValues;
    }) => {
      if (appointmentId) {
        await updateAppointment(appointmentId, values);
        return "updated";
      }

      await createAppointment(values);
      return "created";
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      appointment,
      status,
    }: {
      appointment: Appointment;
      status: AppointmentStatus;
    }) => {
      await updateAppointmentStatus(appointment.id, status);

      if (
        status === "confirmed" &&
        appointment.patientEmail &&
        appointment.patientName &&
        appointment.appointmentDate &&
        appointment.appointmentTime &&
        appointment.hospitalLocation
      ) {
        const { sendAppointmentConfirmationEmail } = await import("@/lib/email");

        const emailSent = await sendAppointmentConfirmationEmail({
          to_email: appointment.patientEmail,
          to_name: appointment.patientName,
          doctor_name: "Dr. Muzammil Ambekar",
          appointment_date: appointment.appointmentDate,
          appointment_time: appointment.appointmentTime,
          location: appointment.hospitalLocation,
          clinic_phone: "+91-9876543210",
          clinic_whatsapp: "+91-9876543210",
          clinic_email: "drambekar@example.com",
          clinic_website: "www.drambekar.com",
          clinic_address: "123 Medical Center, City",
        });

        if (emailSent) {
          toast.success("Confirmation email sent to patient.");
        } else {
          toast.error("Appointment updated, but the email service is unavailable.");
        }

        const waLink = buildWhatsAppConfirmLink(appointment);
        window.open(waLink, "_blank", "noopener,noreferrer");
      }

      if (
        status === "cancelled" &&
        appointment.patientEmail &&
        appointment.patientName &&
        appointment.appointmentDate &&
        appointment.appointmentTime
      ) {
        const { sendAppointmentCancelledEmail } = await import("@/lib/email");

        await sendAppointmentCancelledEmail(
          appointment.patientEmail,
          appointment.patientName,
          appointment.appointmentDate,
          appointment.appointmentTime,
          "Appointment cancelled by doctor",
        );
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAppointment,
  });

  const handleSave = async (
    values: AppointmentFormValues,
    appointmentId?: string,
  ) => {
    try {
      const result = await saveMutation.mutateAsync({ appointmentId, values });
      toast.success(
        result === "created" ? "Appointment created." : "Appointment updated.",
      );
      setCreateOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error(mapFirestoreError(error));
    }
  };

  const handleStatusChange = async (
    appointment: Appointment,
    status: AppointmentStatus,
  ) => {
    try {
      await statusMutation.mutateAsync({ appointment, status });
      toast.success(`Appointment ${status}.`);
    } catch (error) {
      toast.error(mapFirestoreError(error));
    }
  };

  const onDelete = async () => {
    if (!deleteId) return;

    const appointment = appointments.find((item) => item.id === deleteId);
    if (!appointment) {
      setDeleteId(null);
      return;
    }

    setOptimisticDeleted((current) => ({
      ...current,
      [deleteId]: appointment,
    }));
    setDeleteId(null);

    try {
      await deleteMutation.mutateAsync(appointment.id);
      toast.success("Appointment deleted.");
    } catch (error) {
      setOptimisticDeleted((current) => {
        const next = { ...current };
        delete next[appointment.id];
        return next;
      });
      toast.error(mapFirestoreError(error));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Appointments</h1>
          <p className="mt-1 text-muted-foreground">
            Real-time appointment monitoring with focused Firestore reads.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-gradient-primary shadow-card">
              <Plus className="mr-2 h-4 w-4" /> New Appointment
            </Button>
          </DialogTrigger>
          <AppointmentForm
            busy={saveMutation.isPending}
            onClose={() => setCreateOpen(false)}
            onSubmit={handleSave}
          />
        </Dialog>
      </div>

      <Card className="rounded-2xl border-0 p-4 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by patient, email, phone, location, or date"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 rounded-xl pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as AppointmentStatus | "all")
            }
          >
            <SelectTrigger className="h-11 w-full rounded-xl sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            Listening only to the latest {totalLoaded} appointment
            {totalLoaded === 1 ? "" : "s"} in the current filter.
          </p>
          <p>Sorted by newest booking first.</p>
        </div>
      </Card>

      {error ? (
        <Card className="rounded-2xl border border-destructive/20 p-6 shadow-card">
          <p className="font-medium text-destructive">Unable to load appointments.</p>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-2xl border-0 shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Loader2 className="inline h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : visibleAppointments.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No appointments found for the current filter.
                  </td>
                </tr>
              ) : (
                visibleAppointments.map((appointment) => (
                  <AppointmentRow
                    key={appointment.id}
                    appointment={appointment}
                    busy={
                      (statusMutation.isPending &&
                        statusMutation.variables?.appointment.id ===
                          appointment.id) ||
                      (deleteMutation.isPending &&
                        deleteMutation.variables === appointment.id)
                    }
                    onDelete={() => setDeleteId(appointment.id)}
                    onEdit={() => setEditing(appointment)}
                    onStatusChange={handleStatusChange}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {hasMore && !loading ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={loadMore}
            disabled={loading}
          >
            Load 20 more appointments
          </Button>
        </div>
      ) : null}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        {editing ? (
          <AppointmentForm
            appointment={editing}
            busy={saveMutation.isPending}
            onClose={() => setEditing(null)}
            onSubmit={(values) => handleSave(values, editing.id)}
          />
        ) : null}
      </Dialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              The row is removed from the UI immediately. If Firestore rejects
              the delete, it will be restored automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="rounded-xl bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const AppointmentRow = memo(function AppointmentRow({
  appointment,
  busy,
  onDelete,
  onEdit,
  onStatusChange,
}: {
  appointment: Appointment;
  busy: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onStatusChange: (
    appointment: Appointment,
    status: AppointmentStatus,
  ) => Promise<void>;
}) {
  return (
    <tr className="border-t border-border/60 transition-colors hover:bg-muted/30">
      <td className="px-4 py-3 font-medium">{appointment.patientName}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {appointment.patientEmail || "-"}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {appointment.patientPhone || "-"}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {appointment.hospitalLocation || "-"}
      </td>
      <td className="px-4 py-3">
        {appointment.appointmentDate
          ? format(new Date(appointment.appointmentDate), "MMM d, yyyy")
          : "-"}
      </td>
      <td className="px-4 py-3">{appointment.appointmentTime || "-"}</td>
      <td className="px-4 py-3">
        <StatusBadge status={appointment.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {appointment.status !== "confirmed" ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-success hover:bg-success/10"
              onClick={() => void onStatusChange(appointment, "confirmed")}
              disabled={busy}
              title="Confirm appointment"
            >
              <Check className="h-4 w-4" />
            </Button>
          ) : null}
          {appointment.status !== "cancelled" ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={() => void onStatusChange(appointment, "cancelled")}
              disabled={busy}
              title="Cancel appointment"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onEdit}
            disabled={busy}
            title="Edit appointment"
          >
            <Calendar className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            disabled={busy}
            title="Delete appointment"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </td>
    </tr>
  );
});

function AppointmentForm({
  appointment,
  busy,
  onClose,
  onSubmit,
}: {
  appointment?: Appointment;
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: AppointmentFormValues) => Promise<void>;
}) {
  const [form, setForm] = useState<AppointmentFormValues>({
    patientName: appointment?.patientName ?? INITIAL_FORM.patientName,
    patientEmail: appointment?.patientEmail ?? INITIAL_FORM.patientEmail,
    patientPhone: appointment?.patientPhone ?? INITIAL_FORM.patientPhone,
    hospitalLocation:
      appointment?.hospitalLocation ?? INITIAL_FORM.hospitalLocation,
    appointmentDate:
      appointment?.appointmentDate ?? INITIAL_FORM.appointmentDate,
    appointmentTime:
      appointment?.appointmentTime ?? INITIAL_FORM.appointmentTime,
    status: appointment?.status ?? INITIAL_FORM.status,
  });

  const submit = async () => {
    if (!form.patientName || !form.appointmentDate || !form.appointmentTime) {
      toast.error("Name, date, and time are required.");
      return;
    }

    await onSubmit(form);
  };

  return (
    <DialogContent className="max-w-lg rounded-2xl">
      <DialogHeader>
        <DialogTitle className="font-display">
          {appointment ? "Edit appointment" : "New appointment"}
        </DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
        <Field label="Patient name" className="sm:col-span-2">
          <Input
            value={form.patientName}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                patientName: event.target.value,
              }))
            }
            className="rounded-xl"
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.patientEmail}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                patientEmail: event.target.value,
              }))
            }
            className="rounded-xl"
          />
        </Field>
        <Field label="Phone">
          <Input
            value={form.patientPhone}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                patientPhone: event.target.value,
              }))
            }
            className="rounded-xl"
          />
        </Field>
        <Field label="Location" className="sm:col-span-2">
          <Select
            value={form.hospitalLocation}
            onValueChange={(value) =>
              setForm((current) => ({
                ...current,
                hospitalLocation: value,
              }))
            }
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Clinic">Clinic</SelectItem>
              <SelectItem value="Hospital">Hospital</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Date">
          <Input
            type="date"
            value={form.appointmentDate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                appointmentDate: event.target.value,
              }))
            }
            className="rounded-xl"
          />
        </Field>
        <Field label="Time">
          <Input
            type="time"
            value={form.appointmentTime}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                appointmentTime: event.target.value,
              }))
            }
            className="rounded-xl"
          />
        </Field>
        <Field label="Status" className="sm:col-span-2">
          <Select
            value={form.status}
            onValueChange={(value) =>
              setForm((current) => ({
                ...current,
                status: value as AppointmentStatus,
              }))
            }
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} className="rounded-xl">
          Cancel
        </Button>
        <Button
          onClick={() => void submit()}
          disabled={busy}
          className="rounded-xl bg-gradient-primary"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
