export const DRIVER_STATUS_VALUES = [
  "ADDITIONAL_DETAILS_SENT",
  "ADDITIONAL_DETAILS_COMPLETED",
  "INTERNAL_DETAILS_SENT",
  "INTERNAL_DETAILS_COMPLETED",
  "AWAITING_INDUCTION",
  "WITHDRAWN",
  "REJECTED",
] as const;

export type DriverStatus = (typeof DRIVER_STATUS_VALUES)[number];

export const driverStatusLabels: Record<DriverStatus, string> = {
  ADDITIONAL_DETAILS_SENT: "Additional Details Sent",
  ADDITIONAL_DETAILS_COMPLETED: "Additional Details Completed",
  INTERNAL_DETAILS_SENT: "Internal Details Sent",
  INTERNAL_DETAILS_COMPLETED: "Internal Details Completed",
  AWAITING_INDUCTION: "Awaiting Induction",
  WITHDRAWN: "Withdrawn",
  REJECTED: "Rejected",
};

export const driverStatusColors: Record<DriverStatus, string> = {
  ADDITIONAL_DETAILS_SENT: "bg-amber-100 text-amber-800",
  ADDITIONAL_DETAILS_COMPLETED: "bg-emerald-100 text-emerald-800",
  INTERNAL_DETAILS_SENT: "bg-sky-100 text-sky-800",
  INTERNAL_DETAILS_COMPLETED: "bg-blue-100 text-blue-800",
  AWAITING_INDUCTION: "bg-violet-100 text-violet-800",
  WITHDRAWN: "bg-slate-200 text-slate-700",
  REJECTED: "bg-rose-100 text-rose-800",
};

export function isDriverStatus(value: string): value is DriverStatus {
  return DRIVER_STATUS_VALUES.includes(value as DriverStatus);
}
