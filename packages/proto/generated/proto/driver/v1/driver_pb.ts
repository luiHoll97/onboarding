/**
 * Stub: run `yarn codegen:proto` to generate real code with buf.
 * This file is overwritten by buf generate.
 */
export enum DriverStatus {
  UNSPECIFIED = 0,
  PENDING = 1,
  APPROVED = 2,
  REJECTED = 3,
}

export enum AuditAction {
  UNSPECIFIED = 0,
  CREATED = 1,
  UPDATED = 2,
  STATUS_CHANGED = 3,
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: AuditAction;
  timestamp: string;
  field: string;
  oldValue: string;
  newValue: string;
  note: string;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: DriverStatus;
  appliedAt?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationalInsuranceNumber: string;
  rightToWorkCheckCode: string;
  inductionDate: string;
  interviewDate: string;
  idDocumentType: string;
  idDocumentNumber: string;
  idCheckCompleted: boolean;
  idCheckCompletedAt: string;
  driversLicenseNumber: string;
  driversLicenseExpiryDate: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postcode: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  vehicleType: string;
  notes: string;
  auditTrail: AuditEvent[];
}

export interface GetDriverRequest {
  id: string;
}

export interface GetDriverResponse {
  driver?: Driver;
}

export interface ListDriversRequest {
  pageSize?: number;
  pageToken?: string;
}

export interface ListDriversResponse {
  drivers: Driver[];
  nextPageToken?: string;
}

export interface GetDriversByFiltersRequest {
  statusFilter?: DriverStatus;
  search?: string;
  pageSize?: number;
  pageToken?: string;
}

export interface GetDriversByFiltersResponse {
  drivers: Driver[];
  nextPageToken?: string;
}

export interface BatchGetDriversRequest {
  ids: string[];
}

export interface BatchGetDriversResponse {
  drivers: Driver[];
}

export interface GetDriverStatsRequest {
  statusFilter?: DriverStatus;
  search?: string;
}

export interface GetDriverStatsResponse {
  byStatus?: Record<string, number>;
  total?: number;
}

export interface UpdateDriverRequest {
  driver?: Driver;
  actor?: string;
}

export interface UpdateDriverResponse {
  driver?: Driver;
}

export interface SendAdditionalDetailsFormRequest {
  driverId: string;
  mondayId: string;
}

export interface SendAdditionalDetailsFormResponse {
  sent: boolean;
  prefilledUrl: string;
  qrCodeUrl: string;
  messageId: string;
}
