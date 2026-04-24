import emailjs from "@emailjs/browser";

// EmailJS Config
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "";

const EMAILJS_SERVICE_ID =
  import.meta.env.VITE_EMAILJS_SERVICE_ID || "service_6um7xfg";

const EMAILJS_TEMPLATE_ID =
  import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "template_iym9ph8";

// Initialize EmailJS
if (EMAILJS_PUBLIC_KEY) {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

/* -----------------------------
   Email Parameters Interface
------------------------------*/
export interface EmailParams {
  to_email: string;
  to_name: string;
  doctor_name: string;
  appointment_date: string;
  appointment_time: string;
  location: string;

  clinic_phone: string;
  clinic_whatsapp: string;
  clinic_email: string;
  clinic_website: string;
  clinic_address: string;
}

/* -----------------------------
   Send Appointment Confirmation
------------------------------*/
export async function sendAppointmentConfirmationEmail(
  params: EmailParams,
): Promise<boolean> {
  if (!EMAILJS_PUBLIC_KEY) {
    console.warn("EmailJS not configured. Add VITE_EMAILJS_PUBLIC_KEY in .env");
    return false;
  }

  const {
    to_email,
    to_name,
    doctor_name,
    appointment_date,
    appointment_time,
    location,
    clinic_phone,
    clinic_whatsapp,
    clinic_email,
    clinic_website,
    clinic_address,
  } = params;

  // Validation
  if (
    !to_email ||
    !to_name ||
    !doctor_name ||
    !appointment_date ||
    !appointment_time ||
    !location
  ) {
    console.error("Missing required email parameters:", params);
    return false;
  }

  try {
    console.log("EmailJS sending with:", {
      serviceId: EMAILJS_SERVICE_ID,
      templateId: EMAILJS_TEMPLATE_ID,
      to_email,
      to_name,
      doctor_name,
      appointment_date,
      appointment_time,
      location,
      clinic_phone,
      clinic_whatsapp,
      clinic_email,
      clinic_website,
      clinic_address,
    });

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        // IMPORTANT: Must match EmailJS template variable
        to_email: to_email,

        to_name,
        doctor_name,
        appointment_date,
        appointment_time,
        location,
        clinic_phone,
        clinic_whatsapp,
        clinic_email,
        clinic_website,
        clinic_address,
      },
    );

    console.log("Appointment confirmation email sent successfully:", response);

    return true;
  } catch (error: unknown) {
    console.error("Failed to send confirmation email:", error);

    if (error && typeof error === "object" && "text" in error) {
      const emailJsError = error as {
        text: string;
        status: number;
      };

      console.error("EmailJS Error Details:", emailJsError.text);
      console.error("Status Code:", emailJsError.status);
    }

    return false;
  }
}

/* -----------------------------
   Send Cancellation Email
------------------------------*/
export async function sendAppointmentCancelledEmail(
  email: string,
  name: string,
  appointmentDate: string,
  appointmentTime: string,
  reason?: string,
): Promise<boolean> {
  if (!EMAILJS_PUBLIC_KEY) {
    console.warn("EmailJS not configured.");
    return false;
  }

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, "template_appointment_cancelled", {
      to_email: email,
      to_name: name,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      cancellation_reason: reason || "No reason provided",
    });

    console.log("Cancellation email sent successfully");
    return true;
  } catch (error) {
    console.error("Failed to send cancellation email:", error);
    return false;
  }
}
