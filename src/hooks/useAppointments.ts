import { useEffect, useMemo, useState } from "react";
import { subscribeToAppointments, type Appointment, type AppointmentStatus } from "@/services/appointmentService";

interface UseAppointmentsOptions {
  search: string;
  status: AppointmentStatus | "all";
  pageSize?: number;
}

function buildSearchBlob(appointment: Appointment) {
  return [
    appointment.patientName,
    appointment.patientEmail,
    appointment.patientPhone,
    appointment.hospitalLocation,
    appointment.appointmentDate,
    appointment.appointmentTime,
    appointment.status,
  ]
    .join(" ")
    .toLowerCase();
}

export function useAppointments({
  search,
  status,
  pageSize = 20,
}: UseAppointmentsOptions) {
  const [page, setPage] = useState(1);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToAppointments(
      { status, pageSize: page * pageSize },
      (nextAppointments) => {
        setAppointments(nextAppointments);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError);
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [page, pageSize, status]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredAppointments = useMemo(() => {
    if (!normalizedSearch) {
      return appointments;
    }

    return appointments.filter((appointment) =>
      buildSearchBlob(appointment).includes(normalizedSearch),
    );
  }, [appointments, normalizedSearch]);

  return {
    appointments: filteredAppointments,
    totalLoaded: appointments.length,
    loading,
    error,
    hasMore: appointments.length >= page * pageSize,
    loadMore: () => setPage((currentPage) => currentPage + 1),
  };
}
