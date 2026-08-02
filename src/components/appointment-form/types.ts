import { Id } from "../../../convex/_generated/dataModel";

export type AppointmentRecord = {
  _id: Id<"appointments">;
  patientId?: Id<"patients">;
  typeId: Id<"appointmentTypes">;
  title?: string;
  startTime: number;
  endTime: number;
  notes?: string;
  paymentStatus: "paid" | "unpaid" | "owes" | "na";
  paymentMethod?: string;
  paymentNotes?: string;
  status: "confirmed" | "cancelled" | "no_show" | "completed";
  reminderEnabled: boolean;
};

export type AppointmentState = {
  patientId?: Id<"patients">;
  typeId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  endsNextDay: boolean;
  notes: string;
  paymentStatus: AppointmentRecord["paymentStatus"];
  paymentMethod: string;
  paymentNotes: string;
  status: AppointmentRecord["status"];
  reminder: boolean;
  recurrenceCount: 1 | 4 | 8 | 12;
  duplicating: boolean;
  showConflicts: boolean;
  error: string;
  errorControlId: string;
  configInitialized: boolean;
  endEdited: boolean;
};
