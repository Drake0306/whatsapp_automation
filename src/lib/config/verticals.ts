export interface VerticalConfig {
  id: string;
  name: string;
  description: string;
  defaultSkills: string[];
  appointmentTypes: { id: string; label: string; defaultDuration: number }[];
  rebookDays: number;
  extraFields?: { key: string; label: string; type: "text" | "number" }[];
}

export const verticals: Record<string, VerticalConfig> = {
  salon: {
    id: "salon",
    name: "Salon",
    description: "Hair, beauty, and grooming services",
    defaultSkills: [
      "faq",
      "booking",
      "reschedule",
      "cancel",
      "reminder",
      "rebook_nudge",
      "cold_lead_nudge",
      "fallback",
      "escalate",
    ],
    appointmentTypes: [
      { id: "haircut", label: "Haircut", defaultDuration: 30 },
      { id: "hair_colour", label: "Hair Colour", defaultDuration: 90 },
      { id: "facial", label: "Facial", defaultDuration: 60 },
      { id: "manicure", label: "Manicure", defaultDuration: 45 },
      { id: "pedicure", label: "Pedicure", defaultDuration: 45 },
      { id: "bridal", label: "Bridal Package", defaultDuration: 180 },
      { id: "other", label: "Other", defaultDuration: 60 },
    ],
    rebookDays: 30,
  },
  clinic: {
    id: "clinic",
    name: "Clinic",
    description: "Dental, physio, dermatology, and general clinics",
    defaultSkills: [
      "faq",
      "booking",
      "reschedule",
      "cancel",
      "reminder",
      "rebook_nudge",
      "cold_lead_nudge",
      "prescription_reminder",
      "fallback",
      "escalate",
    ],
    appointmentTypes: [
      { id: "consultation", label: "Consultation", defaultDuration: 30 },
      { id: "follow_up", label: "Follow-up", defaultDuration: 15 },
      { id: "procedure", label: "Procedure", defaultDuration: 60 },
      { id: "cleaning", label: "Dental Cleaning", defaultDuration: 45 },
      { id: "checkup", label: "General Check-up", defaultDuration: 30 },
      { id: "other", label: "Other", defaultDuration: 30 },
    ],
    rebookDays: 90,
    extraFields: [
      { key: "doctorName", label: "Doctor Name", type: "text" },
      { key: "gstNumber", label: "GST Number", type: "text" },
    ],
  },
  coaching: {
    id: "coaching",
    name: "Coaching Centre",
    description: "Coaching, tutoring, and education centres",
    defaultSkills: [
      "faq",
      "booking",
      "reschedule",
      "cancel",
      "reminder",
      "fee_reminder",
      "exam_countdown",
      "cold_lead_nudge",
      "fallback",
      "escalate",
    ],
    appointmentTypes: [
      { id: "trial_class", label: "Trial Class", defaultDuration: 60 },
      { id: "doubt_session", label: "Doubt Session", defaultDuration: 30 },
      { id: "parent_meeting", label: "Parent Meeting", defaultDuration: 30 },
      { id: "other", label: "Other", defaultDuration: 60 },
    ],
    rebookDays: 7,
    extraFields: [
      { key: "batchName", label: "Batch Name", type: "text" },
      { key: "monthlyFee", label: "Monthly Fee (INR)", type: "number" },
    ],
  },
  retail: {
    id: "retail",
    name: "Retail / Kirana",
    description: "Shops and retail stores",
    defaultSkills: [
      "faq",
      "cold_lead_nudge",
      "fallback",
      "escalate",
    ],
    appointmentTypes: [],
    rebookDays: 14,
  },
  other: {
    id: "other",
    name: "Other",
    description: "General business",
    defaultSkills: [
      "faq",
      "booking",
      "reschedule",
      "cancel",
      "reminder",
      "fallback",
      "escalate",
    ],
    appointmentTypes: [
      { id: "appointment", label: "Appointment", defaultDuration: 60 },
    ],
    rebookDays: 30,
  },
};

export function getVertical(id: string): VerticalConfig {
  return verticals[id] ?? verticals["other"];
}
