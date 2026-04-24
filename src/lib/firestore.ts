import {
  collection,
  query,
  orderBy,
  getDocs,
  limit,
  startAfter,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getCountFromServer,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { getDb, isFirebaseConfigured } from "./firebase";

export type AppointmentStatus = "pending" | "confirmed" | "cancelled";

export interface Appointment {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  createdAt?: { seconds: number } | null;
  // Legacy field names from user-facing booking documents
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  hospitalLocation?: string;
  appointmentDate?: string;
  appointmentTime?: string;
}

export interface Blog {
  id: string;
  title: string;
  content: string;
  category: string;
  imageUrl?: string;
  imagePath?: string;
  slug?: string;
  status: "draft" | "published";
  createdAt?: { seconds: number } | null;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  contacted?: boolean;
  createdAt?: { seconds: number } | null;
}

type PaginatedResult<T> = {
  data: T[];
  lastVisible: QueryDocumentSnapshot<DocumentData> | null;
  finished: boolean;
};

function normalizeDoc<T extends { id: string }>(
  document: QueryDocumentSnapshot<DocumentData>,
): T {
  const rawData = document.data() as Record<string, unknown>;

  const normalizedAppointment = {
    name: (rawData.name as string) ?? (rawData.patientName as string) ?? "",
    email: (rawData.email as string) ?? (rawData.patientEmail as string) ?? "",
    phone: (rawData.phone as string) ?? (rawData.patientPhone as string) ?? "",
    location:
      (rawData.location as string) ??
      (rawData.hospitalLocation as string) ??
      "",
    date: (rawData.date as string) ?? (rawData.appointmentDate as string) ?? "",
    time: (rawData.time as string) ?? (rawData.appointmentTime as string) ?? "",
  };

  return {
    id: document.id,
    ...rawData,
    ...normalizedAppointment,
  } as T;
}

export function useCollection<T extends { id: string }>(
  name: string,
  pageSize = 25,
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastVisible, setLastVisible] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [finished, setFinished] = useState(false);

  const fetchPage = useCallback(
    async (cursor?: QueryDocumentSnapshot<DocumentData>) => {
      const constraints: Array<QueryConstraint> = [
        orderBy("createdAt", "desc"),
        limit(pageSize),
      ];
      if (cursor) constraints.push(startAfter(cursor));
      const q = query(collection(getDb(), name), ...constraints);
      const snapshot = await getDocs(q);
      return {
        rows: snapshot.docs.map((doc) => normalizeDoc<T>(doc)),
        lastVisible: snapshot.docs[snapshot.docs.length - 1] ?? null,
        finished: snapshot.docs.length < pageSize,
      };
    },
    [name, pageSize],
  );

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError(null);
    setData([]);
    setLastVisible(null);
    setFinished(false);

    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    fetchPage()
      .then((result) => {
        if (!mounted) return;
        setData(result.rows);
        setLastVisible(result.lastVisible);
        setFinished(result.finished);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (finished || !lastVisible) return;
    const result = await fetchPage(lastVisible);
    setData((prev) => [...prev, ...result.rows]);
    setLastVisible(result.lastVisible);
    setFinished(result.finished);
  }, [fetchPage, finished, lastVisible]);

  return { data, loading, error, finished, loadMore };
}

export async function getCollectionPage<T extends { id: string }>(
  name: string,
  pageSize = 25,
  constraints: QueryConstraint[] = [],
  cursor?: QueryDocumentSnapshot<DocumentData>,
): Promise<PaginatedResult<T>> {
  const queryConstraints = [
    ...constraints,
    orderBy("createdAt", "desc"),
    limit(pageSize),
  ];
  if (cursor) queryConstraints.push(startAfter(cursor));
  const q = query(collection(getDb(), name), ...queryConstraints);
  const snapshot = await getDocs(q);
  return {
    data: snapshot.docs.map((document) => normalizeDoc<T>(document)),
    lastVisible: snapshot.docs[snapshot.docs.length - 1] ?? null,
    finished: snapshot.docs.length < pageSize,
  };
}

export async function getCollectionCount(
  name: string,
  constraints: QueryConstraint[] = [],
): Promise<number> {
  const q = query(collection(getDb(), name), ...constraints);
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}

export const createDoc = (name: string, payload: Record<string, unknown>) =>
  addDoc(collection(getDb(), name), {
    ...payload,
    createdAt: serverTimestamp(),
  });

export const updateDocById = (
  name: string,
  id: string,
  payload: Record<string, unknown>,
) => updateDoc(doc(getDb(), name, id), payload);

export const deleteDocById = (name: string, id: string) =>
  deleteDoc(doc(getDb(), name, id));
