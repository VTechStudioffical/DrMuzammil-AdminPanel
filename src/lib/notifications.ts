import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  QueryConstraint,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";

export interface Notification {
  id: string;
  type: "appointment" | "inquiry" | "blog" | "system";
  title: string;
  message: string;
  icon: "calendar" | "message" | "file" | "bell";
  read: boolean;
  createdAt: number;
  actionUrl?: string;
  actionLabel?: string;
}

type NotificationCallback = (notifications: Notification[]) => void;

interface AppointmentNotification extends Notification {
  status?: string;
}

/* ------------------------------------
   APPOINTMENT NOTIFICATIONS
------------------------------------ */
export function subscribeToNewAppointments(
  onUpdate: NotificationCallback,
  constraints: QueryConstraint[] = [],
) {
  if (!isFirebaseConfigured()) {
    onUpdate([]);
    return () => {};
  }

  const appointmentsQuery = query(
    collection(getDb(), "appointments"),
    orderBy("createdAt", "desc"),
    limit(10),
    ...constraints,
  );

  return onSnapshot(
    appointmentsQuery,
    (snapshot) => {
      const notifications: AppointmentNotification[] = snapshot.docs
        .map((doc) => {
          const data = doc.data();

          return {
            id: `apt-${doc.id}`,
            type: "appointment" as const,
            title: "New Appointment Request",
            message: `${
              data.patientName || data.name || "Patient"
            } requested an appointment`,
            icon: "calendar" as const,
            read: false,
            createdAt: data.createdAt?.seconds
              ? data.createdAt.seconds * 1000
              : Date.now(),
            actionUrl: "/appointments",
            actionLabel: "View",
            status: data.status,
          };
        })
        .filter((item) => item.status === "pending")
        .slice(0, 5);

      // remove status before sending final notifications
      const finalNotifications: Notification[] = notifications.map(
        ({ status, ...notification }) => notification,
      );

      onUpdate(finalNotifications);
    },
    (error) => {
      console.error("Appointments notification error:", error);
      onUpdate([]);
    },
  );
}

/* ------------------------------------
   INQUIRY NOTIFICATIONS
------------------------------------ */
export function subscribeToNewInquiries(
  onUpdate: NotificationCallback,
  constraints: QueryConstraint[] = [],
) {
  if (!isFirebaseConfigured()) {
    onUpdate([]);
    return () => {};
  }

  const inquiriesQuery = query(
    collection(getDb(), "inquiries"),
    orderBy("createdAt", "desc"),
    limit(5),
    ...constraints,
  );

  return onSnapshot(
    inquiriesQuery,
    (snapshot) => {
      const notifications: Notification[] = snapshot.docs.map((doc) => {
        const data = doc.data();

        return {
          id: `inq-${doc.id}`,
          type: "inquiry" as const,
          title: "New Inquiry",
          message: `${data.name || "Patient"} sent an inquiry`,
          icon: "message" as const,
          read: false,
          createdAt: data.createdAt?.seconds
            ? data.createdAt.seconds * 1000
            : Date.now(),
          actionUrl: "/inquiries",
          actionLabel: "Reply",
        };
      });

      onUpdate(notifications);
    },
    (error) => {
      console.error("Inquiry notification error:", error);
      onUpdate([]);
    },
  );
}

/* ------------------------------------
   MERGE ALL NOTIFICATIONS
------------------------------------ */
export function subscribeToAllNotifications(onUpdate: NotificationCallback) {
  const notificationMap = new Map<string, Notification>();

  const updateAllNotifications = () => {
    const allNotifications = Array.from(notificationMap.values()).sort(
      (a, b) => b.createdAt - a.createdAt,
    );

    onUpdate(allNotifications);
  };

  const unsubscribeAppointments = subscribeToNewAppointments((data) => {
    data.forEach((item) => notificationMap.set(item.id, item));

    updateAllNotifications();
  });

  const unsubscribeInquiries = subscribeToNewInquiries((data) => {
    data.forEach((item) => notificationMap.set(item.id, item));

    updateAllNotifications();
  });

  return () => {
    unsubscribeAppointments();
    unsubscribeInquiries();
  };
}
