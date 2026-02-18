import express from "express";
import cors from "cors";
import type { Request, Response } from "express";
import {
  AdminPermission,
  AdminRole,
  DriverStatus,
  type Driver,
  type BatchGetDriversRequest,
  type GetDriversByFiltersRequest,
  type GetDriverRequest,
  type SendAdditionalDetailsFormRequest,
  type GetDriverStatsRequest,
  type ListDriversRequest,
  type UpdateDriverRequest,
} from "@driver-onboarding/proto";
import type {
  CreatePrefilledFormLinkRequest,
  IngestProviderWebhookRequest,
  IngestProviderWebhookResponse,
  ListWebhookEventsRequest,
  CreateAdminRequest,
  SendFormInvitationRequest,
  DeleteAdminRequest,
  GetAdminRequest,
  ListAdminsRequest,
  LoginRequest,
  LogoutRequest,
  UpdateAdminAccessRequest,
  ValidateSessionRequest,
} from "@driver-onboarding/proto";
import { createDatabaseAdapter } from "./db-adapter.js";
import { createFormsService } from "./forms.js";

const app = express();
app.use(cors());
app.use(express.json());

const db = createDatabaseAdapter();
const formsService = createFormsService();
const providerProcessing = new Set<string>();

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) {
      return message;
    }
  }
  return fallback;
}

const typeformFieldRefToKey: Record<string, string> = {
  "bbc1908b-14c5-4b99-8365-5055c2c9cefc": "details_confirmed",
  "d2745455-71ba-4d31-a07b-c675350b8730": "date_of_birth",
  "92fc8a3f-466e-4dbf-825b-5c1f211c3940": "national_insurance_number",
  "ddd7b1a2-972a-48e5-9fe8-e8204c5de29b": "emergency_contact_name",
  "02bac3a4-d6e6-4bd8-a944-8648612ab95f": "emergency_contact_relationship",
  "acff250a-11fe-4845-affc-b5db5c5cea7f": "emergency_contact_phone",
  "185eb1c7-20bb-4ea9-984a-a8aa1732c01e": "preferred_days_per_week",
  "b458f157-4547-4279-bc8f-7f1a5f341413": "preferred_start_day",
  "07cc1c10-b4e4-4f01-9774-073cb5cae0f8": "preferred_start_date",
};

function objectField(source: unknown, key: string): unknown {
  if (typeof source !== "object" || source === null) {
    return undefined;
  }
  if (!(key in source)) {
    return undefined;
  }
  return Reflect.get(source, key);
}

function parseString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function parseInteger(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return fallback;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseDriverStatus(value: unknown): DriverStatus | undefined {
  if (value === DriverStatus.UNSPECIFIED) return DriverStatus.UNSPECIFIED;
  if (value === DriverStatus.PENDING) return DriverStatus.PENDING;
  if (value === DriverStatus.APPROVED) return DriverStatus.APPROVED;
  if (value === DriverStatus.REJECTED) return DriverStatus.REJECTED;
  return undefined;
}

function parseAdminRole(value: unknown): AdminRole {
  if (value === AdminRole.SUPER_ADMIN) return AdminRole.SUPER_ADMIN;
  if (value === AdminRole.OPERATIONS) return AdminRole.OPERATIONS;
  if (value === AdminRole.RECRUITER) return AdminRole.RECRUITER;
  if (value === AdminRole.VIEWER) return AdminRole.VIEWER;
  return AdminRole.UNSPECIFIED;
}

function parseAdminPermission(value: unknown): AdminPermission | undefined {
  if (value === AdminPermission.MANAGE_ADMINS) return AdminPermission.MANAGE_ADMINS;
  if (value === AdminPermission.VIEW_DRIVERS) return AdminPermission.VIEW_DRIVERS;
  if (value === AdminPermission.EDIT_DRIVERS) return AdminPermission.EDIT_DRIVERS;
  if (value === AdminPermission.VIEW_STATS) return AdminPermission.VIEW_STATS;
  if (value === AdminPermission.SEND_FORMS) return AdminPermission.SEND_FORMS;
  return undefined;
}

function parseAdminPermissions(value: unknown): AdminPermission[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: AdminPermission[] = [];
  for (const item of value) {
    const permission = parseAdminPermission(item);
    if (permission !== undefined && !out.includes(permission)) {
      out.push(permission);
    }
  }
  return out;
}

function parseGetDriverRequest(value: unknown): GetDriverRequest {
  return { id: parseString(objectField(value, "id"), "") };
}

function parseListDriversRequest(value: unknown): ListDriversRequest {
  return {
    pageSize: parseInteger(objectField(value, "pageSize"), 10),
    pageToken: parseString(objectField(value, "pageToken"), ""),
  };
}

function parseGetDriversByFiltersRequest(value: unknown): GetDriversByFiltersRequest {
  return {
    statusFilter: parseDriverStatus(objectField(value, "statusFilter")),
    search: parseString(objectField(value, "search"), ""),
    pageSize: parseInteger(objectField(value, "pageSize"), 20),
    pageToken: parseString(objectField(value, "pageToken"), ""),
  };
}

function parseBatchGetDriversRequest(value: unknown): BatchGetDriversRequest {
  const raw = objectField(value, "ids");
  if (!Array.isArray(raw)) {
    return { ids: [] };
  }
  const ids = raw.filter((item): item is string => typeof item === "string");
  return { ids };
}

function parseGetDriverStatsRequest(value: unknown): GetDriverStatsRequest {
  return {
    statusFilter: parseDriverStatus(objectField(value, "statusFilter")),
    search: parseString(objectField(value, "search"), ""),
  };
}

function parseUpdateDriverRequest(value: unknown, current: Driver): UpdateDriverRequest {
  const actor = parseString(objectField(value, "actor"), "system");
  const rawDriver = objectField(value, "driver");
  if (!rawDriver) {
    return { actor, driver: undefined };
  }

  const id = parseString(objectField(rawDriver, "id"), "");
  const idCheck = objectField(rawDriver, "idCheckCompleted");
  return {
    actor,
    driver: {
      ...current,
      id,
      name: parseString(objectField(rawDriver, "name"), current.name),
      firstName: parseString(objectField(rawDriver, "firstName"), current.firstName),
      lastName: parseString(objectField(rawDriver, "lastName"), current.lastName),
      email: parseString(objectField(rawDriver, "email"), current.email),
      phone: parseString(objectField(rawDriver, "phone"), current.phone ?? ""),
      status: parseDriverStatus(objectField(rawDriver, "status")) ?? current.status,
      appliedAt: parseString(objectField(rawDriver, "appliedAt"), current.appliedAt ?? ""),
      dateOfBirth: parseString(objectField(rawDriver, "dateOfBirth"), current.dateOfBirth),
      nationalInsuranceNumber: parseString(
        objectField(rawDriver, "nationalInsuranceNumber"),
        current.nationalInsuranceNumber
      ),
      rightToWorkCheckCode: parseString(
        objectField(rawDriver, "rightToWorkCheckCode"),
        current.rightToWorkCheckCode
      ),
      inductionDate: parseString(objectField(rawDriver, "inductionDate"), current.inductionDate),
      interviewDate: parseString(objectField(rawDriver, "interviewDate"), current.interviewDate),
      idDocumentType: parseString(objectField(rawDriver, "idDocumentType"), current.idDocumentType),
      idDocumentNumber: parseString(
        objectField(rawDriver, "idDocumentNumber"),
        current.idDocumentNumber
      ),
      idCheckCompleted: typeof idCheck === "boolean" ? idCheck : current.idCheckCompleted,
      idCheckCompletedAt: parseString(
        objectField(rawDriver, "idCheckCompletedAt"),
        current.idCheckCompletedAt
      ),
      driversLicenseNumber: parseString(
        objectField(rawDriver, "driversLicenseNumber"),
        current.driversLicenseNumber
      ),
      driversLicenseExpiryDate: parseString(
        objectField(rawDriver, "driversLicenseExpiryDate"),
        current.driversLicenseExpiryDate
      ),
      addressLine1: parseString(objectField(rawDriver, "addressLine1"), current.addressLine1),
      addressLine2: parseString(objectField(rawDriver, "addressLine2"), current.addressLine2),
      city: parseString(objectField(rawDriver, "city"), current.city),
      postcode: parseString(objectField(rawDriver, "postcode"), current.postcode),
      emergencyContactName: parseString(
        objectField(rawDriver, "emergencyContactName"),
        current.emergencyContactName
      ),
      emergencyContactPhone: parseString(
        objectField(rawDriver, "emergencyContactPhone"),
        current.emergencyContactPhone
      ),
      emergencyContactRelationship: parseString(
        objectField(rawDriver, "emergencyContactRelationship"),
        current.emergencyContactRelationship
      ),
      vehicleType: parseString(objectField(rawDriver, "vehicleType"), current.vehicleType),
      preferredDaysPerWeek: parseString(
        objectField(rawDriver, "preferredDaysPerWeek"),
        current.preferredDaysPerWeek
      ),
      preferredStartDate: parseString(
        objectField(rawDriver, "preferredStartDate"),
        current.preferredStartDate
      ),
      detailsConfirmedByDriver: parseString(
        objectField(rawDriver, "detailsConfirmedByDriver"),
        current.detailsConfirmedByDriver
      ),
      notes: parseString(objectField(rawDriver, "notes"), current.notes),
      auditTrail: current.auditTrail,
    },
  };
}

function parseLoginRequest(value: unknown): LoginRequest {
  return {
    email: parseString(objectField(value, "email"), ""),
    password: parseString(objectField(value, "password"), ""),
  };
}

function parseValidateRequest(value: unknown): ValidateSessionRequest {
  return {
    token: parseString(objectField(value, "token"), ""),
  };
}

function parseLogoutRequest(value: unknown): LogoutRequest {
  return {
    token: parseString(objectField(value, "token"), ""),
  };
}

function parseListAdminsRequest(_value: unknown): ListAdminsRequest {
  return {};
}

function parseGetAdminRequest(value: unknown): GetAdminRequest {
  return {
    id: parseString(objectField(value, "id"), ""),
  };
}

function parseCreateAdminRequest(value: unknown): CreateAdminRequest {
  return {
    email: parseString(objectField(value, "email"), "").trim(),
    name: parseString(objectField(value, "name"), "").trim(),
    password: parseString(objectField(value, "password"), ""),
    role: parseAdminRole(objectField(value, "role")),
    permissions: parseAdminPermissions(objectField(value, "permissions")),
  };
}

function parseUpdateAdminAccessRequest(value: unknown): UpdateAdminAccessRequest {
  return {
    id: parseString(objectField(value, "id"), ""),
    role: parseAdminRole(objectField(value, "role")),
    permissions: parseAdminPermissions(objectField(value, "permissions")),
  };
}

function parseDeleteAdminRequest(value: unknown): DeleteAdminRequest {
  return {
    id: parseString(objectField(value, "id"), ""),
  };
}

function parseSendAdditionalDetailsFormRequest(
  value: unknown
): SendAdditionalDetailsFormRequest {
  return {
    driverId: parseString(objectField(value, "driverId"), ""),
    mondayId: parseString(objectField(value, "mondayId"), ""),
  };
}

function parsePrefillFields(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null) {
    return {};
  }
  const entries = Object.entries(value);
  const out: Record<string, string> = {};
  for (const [key, entry] of entries) {
    out[key] = parseString(entry, "");
  }
  return out;
}

function parseTypeformEventId(payload: unknown): string {
  const direct = parseString(objectField(payload, "event_id"), "");
  if (direct) {
    return direct;
  }
  const formResponse = objectField(payload, "form_response");
  const token = parseString(objectField(formResponse, "token"), "");
  if (token) {
    return token;
  }
  return `typeform-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseTypeformAnswerValue(answer: unknown): string | boolean | undefined {
  const kind = parseString(objectField(answer, "type"), "");
  if (kind === "boolean") {
    return parseBoolean(objectField(answer, "boolean"), false);
  }
  if (kind === "choice") {
    const choice = objectField(answer, "choice");
    return parseString(objectField(choice, "label"), "");
  }
  if (kind === "choices") {
    const choices = objectField(answer, "choices");
    const labels = objectField(choices, "labels");
    if (!Array.isArray(labels)) {
      return "";
    }
    const out: string[] = [];
    for (const label of labels) {
      if (typeof label === "string") {
        out.push(label);
      }
    }
    return out.join(", ");
  }
  if (kind === "number") {
    return String(parseInteger(objectField(answer, "number"), 0));
  }
  const keys = [
    "text",
    "email",
    "phone_number",
    "date",
    "url",
    "file_url",
  ];
  for (const key of keys) {
    const value = parseString(objectField(answer, key), "");
    if (value) {
      return value;
    }
  }
  return undefined;
}

function parseTypeformResponse(payload: unknown): {
  driverId: string;
  email: string;
  submittedAt: string;
  fields: Record<string, string | boolean>;
} {
  const formResponse = objectField(payload, "form_response");
  const hidden = objectField(formResponse, "hidden");
  const fields: Record<string, string | boolean> = {};
  if (typeof hidden === "object" && hidden !== null) {
    for (const [key, value] of Object.entries(hidden)) {
      if (typeof value === "string") {
        fields[key] = value;
      }
    }
  }

  const answers = objectField(formResponse, "answers");
  if (Array.isArray(answers)) {
    for (const answer of answers) {
      const field = objectField(answer, "field");
      const ref = parseString(objectField(field, "ref"), "");
      if (!ref) {
        continue;
      }
      const parsed = parseTypeformAnswerValue(answer);
      if (parsed !== undefined) {
        fields[ref] = parsed;
        const mapped = typeformFieldRefToKey[ref];
        if (mapped) {
          fields[mapped] = parsed;
        }
      }
    }
  }

  return {
    driverId:
      parseString(fields.driverId, "") ||
      parseString(fields.monday_id, "") ||
      parseString(fields.driver_id, "") ||
      parseString(objectField(hidden, "driverId"), ""),
    email:
      parseString(fields.email, "") ||
      parseString(objectField(formResponse, "hidden_email"), ""),
    submittedAt: parseString(objectField(formResponse, "submitted_at"), ""),
    fields,
  };
}

function readStringField(
  source: Record<string, string | boolean>,
  sourceKey: string
): string | undefined {
  const raw = source[sourceKey];
  if (typeof raw !== "string") {
    return undefined;
  }
  const value = raw.trim();
  if (!value) {
    return undefined;
  }
  return value;
}

function appendWebhookNote(
  current: string,
  eventId: string,
  submittedAt: string
): string {
  const when = submittedAt || new Date().toISOString();
  const line = `[Typeform] submission received at ${when} (event ${eventId})`;
  return current ? `${current}\n${line}` : line;
}

async function processTypeformEvent(payload: unknown, eventId: string): Promise<void> {
  const parsed = parseTypeformResponse(payload);
  let driver = parsed.driverId ? await db.getDriver(parsed.driverId) : undefined;
  if (!driver && parsed.email) {
    driver = await db.findDriverByEmail(parsed.email);
  }
  if (!driver) {
    throw new Error("No driver matched webhook payload");
  }

  const next: Driver = { ...driver, auditTrail: driver.auditTrail };
  const firstName = readStringField(parsed.fields, "first_name");
  if (firstName) {
    next.firstName = firstName;
  }
  const lastName = readStringField(parsed.fields, "last_name");
  if (lastName) {
    next.lastName = lastName;
  }
  if (next.firstName && next.lastName) {
    next.name = `${next.firstName} ${next.lastName}`;
  }
  const email = readStringField(parsed.fields, "email");
  if (email) {
    next.email = email;
  }
  const phone = readStringField(parsed.fields, "phone_number");
  if (phone) {
    next.phone = phone;
  }
  const dateOfBirth = readStringField(parsed.fields, "date_of_birth");
  if (dateOfBirth) {
    next.dateOfBirth = dateOfBirth;
  }
  const ni = readStringField(parsed.fields, "national_insurance_number");
  if (ni) {
    next.nationalInsuranceNumber = ni;
  }
  const rtw = readStringField(parsed.fields, "right_to_work_check_code");
  if (rtw) {
    next.rightToWorkCheckCode = rtw;
  }
  const inductionDate = readStringField(parsed.fields, "induction_date");
  if (inductionDate) {
    next.inductionDate = inductionDate;
  }
  const interviewDate = readStringField(parsed.fields, "interview_date");
  if (interviewDate) {
    next.interviewDate = interviewDate;
  }
  const idDocumentType = readStringField(parsed.fields, "id_document_type");
  if (idDocumentType) {
    next.idDocumentType = idDocumentType;
  }
  const idDocumentNumber = readStringField(parsed.fields, "id_document_number");
  if (idDocumentNumber) {
    next.idDocumentNumber = idDocumentNumber;
  }
  const licenseNumber = readStringField(parsed.fields, "drivers_license_number");
  if (licenseNumber) {
    next.driversLicenseNumber = licenseNumber;
  }
  const licenseExpiry = readStringField(parsed.fields, "drivers_license_expiry_date");
  if (licenseExpiry) {
    next.driversLicenseExpiryDate = licenseExpiry;
  }
  const addressLine1 = readStringField(parsed.fields, "address_line_1");
  if (addressLine1) {
    next.addressLine1 = addressLine1;
  }
  const addressLine2 = readStringField(parsed.fields, "address_line_2");
  if (addressLine2) {
    next.addressLine2 = addressLine2;
  }
  const city = readStringField(parsed.fields, "city");
  if (city) {
    next.city = city;
  }
  const postcode = readStringField(parsed.fields, "postcode");
  if (postcode) {
    next.postcode = postcode;
  }
  const emergencyName = readStringField(parsed.fields, "emergency_contact_name");
  if (emergencyName) {
    next.emergencyContactName = emergencyName;
  }
  const emergencyPhone = readStringField(parsed.fields, "emergency_contact_phone");
  if (emergencyPhone) {
    next.emergencyContactPhone = emergencyPhone;
  }
  const vehicleType = readStringField(parsed.fields, "vehicle_type");
  if (vehicleType) {
    next.vehicleType = vehicleType;
  }
  const idCheckCompleted = parsed.fields.id_check_completed;
  if (typeof idCheckCompleted === "boolean") {
    next.idCheckCompleted = idCheckCompleted;
  }
  const idCheckCompletedAt = readStringField(parsed.fields, "id_check_completed_at");
  if (idCheckCompletedAt) {
    next.idCheckCompletedAt = idCheckCompletedAt;
  }
  const notes = readStringField(parsed.fields, "notes");
  if (notes) {
    next.notes = notes;
  }
  const emergencyRelationship = readStringField(
    parsed.fields,
    "emergency_contact_relationship"
  );
  const preferredDays = readStringField(parsed.fields, "preferred_days_per_week");
  const preferredStartDay = readStringField(parsed.fields, "preferred_start_day");
  const preferredStartDate = readStringField(parsed.fields, "preferred_start_date");
  const detailsConfirmed = parsed.fields.details_confirmed;
  if (emergencyRelationship) {
    next.emergencyContactRelationship = emergencyRelationship;
  }
  if (preferredDays) {
    next.preferredDaysPerWeek = preferredDays;
  }
  if (preferredStartDay) {
    const line = `Preferred start day (4-day week): ${preferredStartDay}`;
    next.notes = next.notes ? `${next.notes}\n${line}` : line;
  }
  if (preferredStartDate) {
    next.preferredStartDate = preferredStartDate;
  }
  if (typeof detailsConfirmed === "boolean") {
    next.detailsConfirmedByDriver = detailsConfirmed ? "yes" : "no";
  }
  next.notes = appendWebhookNote(next.notes, eventId, parsed.submittedAt);

  const updated = await db.updateDriver(next, "typeform response");
  if (!updated) {
    throw new Error("Driver update failed");
  }
}

type ProviderEventHandler = (payload: unknown, externalEventId: string) => Promise<void>;
const providerHandlers: Record<string, ProviderEventHandler> = {
  typeform: processTypeformEvent,
};

async function processProviderEvents(provider: string): Promise<void> {
  if (providerProcessing.has(provider)) {
    return;
  }
  providerProcessing.add(provider);
  try {
    while (true) {
      const event = await db.claimNextWebhookEvent(provider);
      if (!event) {
        break;
      }
      try {
        const handler = providerHandlers[provider];
        if (!handler) {
          throw new Error(`No webhook handler registered for provider "${provider}"`);
        }
        await handler(event.payload, event.externalEventId);
        await db.markWebhookEventProcessed(event.id);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown webhook processing error";
        await db.markWebhookEventFailed(event.id, message, event.attempts);
      }
    }
  } finally {
    providerProcessing.delete(provider);
  }
}

async function ingestProviderWebhook(
  request: IngestProviderWebhookRequest
): Promise<IngestProviderWebhookResponse> {
  const provider = request.provider.toLowerCase();
  if (!provider) {
    throw new Error("provider is required");
  }

  let payload: unknown = {};
  if (request.payloadJson.trim()) {
    try {
      payload = JSON.parse(request.payloadJson);
    } catch {
      throw new Error("payloadJson must be valid JSON");
    }
  }

  const eventName = normalizeEventName(request.eventName) || "event.received";
  const externalEventId =
    request.externalEventId ||
    inferExternalEventId(provider, payload, request.headers);

  const queued = await db.enqueueWebhookEvent({
    provider,
    eventType: eventName,
    externalEventId,
    payload,
  });
  void processProviderEvents(provider);

  return {
    accepted: true,
    duplicate: queued.duplicate,
    eventId: queued.eventId,
    provider,
    eventName,
  };
}

function parseCreatePrefilledFormLinkRequest(
  value: unknown
): CreatePrefilledFormLinkRequest {
  return {
    provider: parseString(objectField(value, "provider"), ""),
    formId: parseString(objectField(value, "formId"), ""),
    prefillFields: parsePrefillFields(objectField(value, "prefillFields")),
  };
}

function parseSendFormInvitationRequest(value: unknown): SendFormInvitationRequest {
  return {
    provider: parseString(objectField(value, "provider"), ""),
    formId: parseString(objectField(value, "formId"), ""),
    prefillFields: parsePrefillFields(objectField(value, "prefillFields")),
    recipientEmail: parseString(objectField(value, "recipientEmail"), ""),
    recipientFirstName: parseString(objectField(value, "recipientFirstName"), ""),
    recipientLastName: parseString(objectField(value, "recipientLastName"), ""),
    senderEmail: parseString(objectField(value, "senderEmail"), ""),
    subject: parseString(objectField(value, "subject"), ""),
  };
}

function parseHeadersRecord(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key.toLowerCase()] = parseString(entry, "");
  }
  return out;
}

function parseIngestProviderWebhookRequest(
  value: unknown
): IngestProviderWebhookRequest {
  return {
    provider: parseString(objectField(value, "provider"), "").toLowerCase(),
    eventName: parseString(objectField(value, "eventName"), ""),
    externalEventId: parseString(objectField(value, "externalEventId"), ""),
    payloadJson: parseString(objectField(value, "payloadJson"), ""),
    headers: parseHeadersRecord(objectField(value, "headers")),
  };
}

function parseListWebhookEventsRequest(value: unknown): ListWebhookEventsRequest {
  return {
    provider: parseString(objectField(value, "provider"), "").toLowerCase(),
    limit: parseInteger(objectField(value, "limit"), 50),
  };
}

function normalizeEventName(eventName: string): string {
  return eventName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferExternalEventId(
  provider: string,
  payload: unknown,
  headers: Record<string, string>
): string {
  const headerEventId = headers["x-event-id"] || headers["x-request-id"];
  if (headerEventId) {
    return headerEventId;
  }
  if (provider === "typeform") {
    return parseTypeformEventId(payload);
  }
  const direct = parseString(objectField(payload, "event_id"), "");
  if (direct) {
    return direct;
  }
  return `${provider}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const rpcMethods = {
  getDriver: "driver.v1.DriverService.GetDriver",
  listDrivers: "driver.v1.DriverService.ListDrivers",
  getDriversByFilters: "driver.v1.DriverService.GetDriversByFilters",
  batchGetDrivers: "driver.v1.DriverService.BatchGetDrivers",
  getDriverStats: "driver.v1.DriverService.GetDriverStats",
  updateDriver: "driver.v1.DriverService.UpdateDriver",
  sendAdditionalDetailsForm: "driver.v1.DriverService.SendAdditionalDetailsForm",
  login: "svc.core.auth.AuthService.Login",
  validateSession: "svc.core.auth.AuthService.ValidateSession",
  logout: "svc.core.auth.AuthService.Logout",
  listAdmins: "svc.core.auth.AuthService.ListAdmins",
  getAdmin: "svc.core.auth.AuthService.GetAdmin",
  createAdmin: "svc.core.auth.AuthService.CreateAdmin",
  updateAdminAccess: "svc.core.auth.AuthService.UpdateAdminAccess",
  deleteAdmin: "svc.core.auth.AuthService.DeleteAdmin",
  createPrefilledFormLink: "service.core.forms.FormsService.CreatePrefilledFormLink",
  sendFormInvitation: "service.core.forms.FormsService.SendFormInvitation",
  ingestProviderWebhook: "service.core.forms.FormsService.IngestProviderWebhook",
  listWebhookEvents: "service.core.forms.FormsService.ListWebhookEvents",
};

type RpcMethod = keyof typeof rpcMethods;

function resolveRpcMethod(method: string): RpcMethod | undefined {
  const entries = Object.entries(rpcMethods);
  for (const [key, value] of entries) {
    if (value === method) {
      if (
        key === "getDriver" ||
        key === "listDrivers" ||
        key === "getDriversByFilters" ||
        key === "batchGetDrivers" ||
        key === "getDriverStats" ||
        key === "updateDriver" ||
        key === "sendAdditionalDetailsForm" ||
        key === "login" ||
        key === "validateSession" ||
        key === "logout" ||
        key === "listAdmins" ||
        key === "getAdmin" ||
        key === "createAdmin" ||
        key === "updateAdminAccess" ||
        key === "deleteAdmin" ||
        key === "createPrefilledFormLink" ||
        key === "sendFormInvitation" ||
        key === "ingestProviderWebhook" ||
        key === "listWebhookEvents"
      ) {
        return key;
      }
    }
  }
  return undefined;
}

async function callRpc(method: RpcMethod, params: unknown): Promise<unknown> {
  if (method === "getDriver") {
    const request = parseGetDriverRequest(params);
    return { driver: await db.getDriver(request.id) };
  }
  if (method === "listDrivers") {
    return db.listDrivers(parseListDriversRequest(params));
  }
  if (method === "getDriversByFilters") {
    return db.getDriversByFilters(parseGetDriversByFiltersRequest(params));
  }
  if (method === "batchGetDrivers") {
    const request = parseBatchGetDriversRequest(params);
    return { drivers: await db.batchGetDrivers(request.ids) };
  }
  if (method === "getDriverStats") {
    return db.getDriverStats(parseGetDriverStatsRequest(params));
  }
  if (method === "updateDriver") {
    const rawDriver = objectField(objectField(params, "driver"), "id");
    const id = parseString(rawDriver, "");
    const current = id ? await db.getDriver(id) : undefined;
    if (!current) {
      return { driver: undefined };
    }
    const request = parseUpdateDriverRequest(params, current);
    if (!request.driver) {
      return { driver: undefined };
    }
    return { driver: await db.updateDriver(request.driver, request.actor ?? "system") };
  }
  if (method === "sendAdditionalDetailsForm") {
    const request = parseSendAdditionalDetailsFormRequest(params);
    const driver = await db.getDriver(request.driverId);
    if (!driver) {
      return {
        sent: false,
        prefilledUrl: "",
        qrCodeUrl: "",
        messageId: "",
      };
    }

    const mondayId = request.mondayId || driver.id;
    const formId = process.env.ADDITIONAL_DETAILS_FORM_ID ?? "IlRPTScI";
    const sender = process.env.FORMS_SENDER_EMAIL ?? "tech.luiholl@gmail.com";
    const subject = "Driver Application Follow-up";
    try {
      return await formsService.sendFormInvitation({
        provider: "typeform",
        formId,
        prefillFields: {
          first_name: driver.firstName,
          last_name: driver.lastName,
          email: driver.email,
          phone_number: driver.phone ?? "",
          monday_id: mondayId,
        },
        recipientEmail: driver.email,
        recipientFirstName: driver.firstName,
        recipientLastName: driver.lastName,
        senderEmail: sender,
        subject,
      });
    } catch (error) {
      const message = errorMessage(error, "Unknown form invitation send error");
      throw new Error(`Failed to send additional details form: ${message}`);
    }
  }
  if (method === "login") {
    return db.login(parseLoginRequest(params));
  }
  if (method === "validateSession") {
    return db.validateSession(parseValidateRequest(params));
  }
  if (method === "logout") {
    return db.logout(parseLogoutRequest(params));
  }
  if (method === "listAdmins") {
    parseListAdminsRequest(params);
    return db.listAdmins();
  }
  if (method === "getAdmin") {
    return db.getAdmin(parseGetAdminRequest(params));
  }
  if (method === "createAdmin") {
    const request = parseCreateAdminRequest(params);
    if (!request.email || !request.name || !request.password) {
      throw new Error("Email, name and password are required");
    }
    return db.createAdmin(request);
  }
  if (method === "updateAdminAccess") {
    const request = parseUpdateAdminAccessRequest(params);
    if (!request.id) {
      throw new Error("Admin id is required");
    }
    return db.updateAdminAccess(request);
  }
  if (method === "deleteAdmin") {
    const request = parseDeleteAdminRequest(params);
    if (!request.id) {
      throw new Error("Admin id is required");
    }
    return db.deleteAdmin(request);
  }
  if (method === "createPrefilledFormLink") {
    return formsService.createPrefilledLink(parseCreatePrefilledFormLinkRequest(params));
  }
  if (method === "sendFormInvitation") {
    return formsService.sendFormInvitation(parseSendFormInvitationRequest(params));
  }
  if (method === "ingestProviderWebhook") {
    return ingestProviderWebhook(parseIngestProviderWebhookRequest(params));
  }
  return db.listWebhookEvents(parseListWebhookEventsRequest(params));
}

app.post("/rpc", async (req: Request, res: Response) => {
  const body = req.body;
  const methodValue = parseString(objectField(body, "method"), "");
  if (!methodValue) {
    res.status(400).json({
      error: { code: "INVALID_REQUEST", message: "Missing method" },
    });
    return;
  }

  const method = resolveRpcMethod(methodValue);
  if (!method) {
    res.status(404).json({
      error: { code: "METHOD_NOT_FOUND", message: `Unknown method: ${methodValue}` },
    });
    return;
  }

  try {
    const result = await callRpc(method, objectField(body, "params"));
    res.json({ result });
  } catch (error) {
    const message = errorMessage(error, "Internal server error");
    console.error("[rpc.error]", { method, message, raw: error });
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message },
    });
  }
});

app.post("/webhooks/:provider/:eventName", async (req: Request, res: Response) => {
  try {
    const response = await ingestProviderWebhook({
      provider: parseString(req.params.provider, "").toLowerCase(),
      eventName: parseString(req.params.eventName, ""),
      externalEventId: "",
      payloadJson: JSON.stringify(req.body ?? {}),
      headers: parseHeadersRecord(req.headers),
    });
    res.status(202).json(response);
  } catch (error) {
    const message = errorMessage(error, "Invalid webhook request");
    res.status(400).json({ error: { code: "INVALID_WEBHOOK", message } });
  }
});

// Backward-compatible alias for existing Typeform integration endpoint.
app.post("/webhooks/typeform", async (req: Request, res: Response) => {
  try {
    const response = await ingestProviderWebhook({
      provider: "typeform",
      eventName: "submission.received",
      externalEventId: "",
      payloadJson: JSON.stringify(req.body ?? {}),
      headers: parseHeadersRecord(req.headers),
    });
    res.status(202).json(response);
  } catch (error) {
    const message = errorMessage(error, "Invalid webhook request");
    res.status(400).json({ error: { code: "INVALID_WEBHOOK", message } });
  }
});

const port = Number(process.env.PORT) || 4001;
app.listen(port, () => {
  console.log(`Services listening on http://localhost:${port}`);
});
