import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type FirestoreError,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";

export type AppointmentStatus = "pending" | "confirmed" | "cancelled";

export interface Appointment {
  id: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  hospitalLocation: string;
  appointmentDate: string;
  appointmentTime: string;
  status: AppointmentStatus;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  updatedAt?: { seconds: number; nanoseconds: number } | null;
  patientNameLower?: string;
  patientEmailLower?: string;
  patientPhoneDigits?: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  date?: string;
  time?: string;
}

export interface AppointmentFilters {
  status: AppointmentStatus | "all";
  pageSize: number;
}

export interface AppointmentFormValues {
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  hospitalLocation: string;
  appointmentDate: string;
  appointmentTime: string;
  status: AppointmentStatus;
}

const APPOINTMENTS_COLLECTION = "appointments";

function normalizeAppointment(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): Appointment {
  const data = snapshot.data() as Record<string, unknown>;

  const patientName =
    (data.patientName as string) ?? (data.name as string) ?? "";
  const patientEmail =
    (data.patientEmail as string) ?? (data.email as string) ?? "";
  const patientPhone =
    (data.patientPhone as string) ?? (data.phone as string) ?? "";
  const hospitalLocation =
    (data.hospitalLocation as string) ?? (data.location as string) ?? "";
  const appointmentDate =
    (data.appointmentDate as string) ?? (data.date as string) ?? "";
  const appointmentTime =
    (data.appointmentTime as string) ?? (data.time as string) ?? "";

  return {
    id: snapshot.id,
    ...(data as Omit<Appointment, "id">),
    patientName,
    patientEmail,
    patientPhone,
    hospitalLocation,
    appointmentDate,
    appointmentTime,
    name: patientName,
    email: patientEmail,
    phone: patientPhone,
    location: hospitalLocation,
    date: appointmentDate,
    time: appointmentTime,
  };
}

function buildAppointmentWritePayload(values: AppointmentFormValues) {
  const patientPhoneDigits = values.patientPhone.replace(/\D/g, "");

  return {
    ...values,
    patientNameLower: values.patientName.trim().toLowerCase(),
    patientEmailLower: values.patientEmail.trim().toLowerCase(),
    patientPhoneDigits,
  };
}

export function subscribeToAppointments(
  filters: AppointmentFilters,
  onData: (appointments: Appointment[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  const constraints: QueryConstraint[] = [];

  if (filters.status !== "all") {
    constraints.push(where("status", "==", filters.status));
  }

  constraints.push(orderBy("createdAt", "desc"));
  constraints.push(limit(filters.pageSize));

  const appointmentsQuery = query(
    collection(getDb(), APPOINTMENTS_COLLECTION),
    ...constraints,
  );

  return onSnapshot(
    appointmentsQuery,
    (snapshot) => {
      onData(snapshot.docs.map(normalizeAppointment));
    },
    (error) => {
      onError(mapFirestoreError(error));
    },
  );
}

export async function createAppointment(values: AppointmentFormValues) {
  return addDoc(collection(getDb(), APPOINTMENTS_COLLECTION), {
    ...buildAppointmentWritePayload(values),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateAppointment(
  id: string,
  values: Partial<AppointmentFormValues>,
) {
  const nextValues = {
    ...values,
    ...(values.patientName
      ? { patientNameLower: values.patientName.trim().toLowerCase() }
      : {}),
    ...(values.patientEmail
      ? { patientEmailLower: values.patientEmail.trim().toLowerCase() }
      : {}),
    ...(values.patientPhone
      ? { patientPhoneDigits: values.patientPhone.replace(/\D/g, "") }
      : {}),
    updatedAt: serverTimestamp(),
  };

  return updateDoc(doc(getDb(), APPOINTMENTS_COLLECTION, id), nextValues);
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
) {
  return updateAppointment(id, { status });
}

export async function deleteAppointment(id: string) {
  return deleteDoc(doc(getDb(), APPOINTMENTS_COLLECTION, id));
}

export function mapFirestoreError(error: unknown) {
  const firestoreError = error as FirestoreError | undefined;

  switch (firestoreError?.code) {
    case "permission-denied":
      return "You do not have permission to perform this action.";
    case "unavailable":
      return "Firestore is temporarily unavailable. Please try again.";
    case "failed-precondition":
      return "This query needs a Firestore index. Create the recommended index and retry.";
    case "unauthenticated":
      return "Please sign in again to continue.";
    default:
      return error instanceof Error ? error.message : "Something went wrong.";
  }
}
