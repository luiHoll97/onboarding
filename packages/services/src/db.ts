import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, scryptSync } from "node:crypto";
import {
  AuditAction,
  AdminPermission,
  AdminRole,
  DriverStatus,
  type AuditEvent,
  type Driver,
  type GetDriverStatsRequest,
  type GetDriverStatsResponse,
  type GetDriversByFiltersRequest,
  type GetDriversByFiltersResponse,
  type ListDriversRequest,
  type ListDriversResponse,
} from "@driver-onboarding/proto";
import type {
  AdminUser,
  CreateAdminRequest,
  CreateAdminResponse,
  DeleteAdminRequest,
  DeleteAdminResponse,
  GetAdminRequest,
  GetAdminResponse,
  ListAdminsResponse,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  LogoutResponse,
  UpdateAdminAccessRequest,
  UpdateAdminAccessResponse,
  ValidateSessionRequest,
  ValidateSessionResponse,
  ListWebhookEventsRequest,
  ListWebhookEventsResponse,
  WebhookEventSummary,
} from "@driver-onboarding/proto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "../.data");
const dbPath = join(dataDir, "driver_onboarding.sqlite");

export interface WebhookEvent {
  id: string;
  provider: string;
  eventType: string;
  externalEventId: string;
  payload: unknown;
  attempts: number;
}

function objectField(source: unknown, key: string): unknown {
  if (typeof source !== "object" || source === null) {
    return undefined;
  }
  if (!(key in source)) {
    return undefined;
  }
  return Reflect.get(source, key);
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function intValue(value: unknown, fallback: number): number {
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

function boolValue(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  return fallback;
}

function isoNow(): string {
  return new Date().toISOString();
}

function passwordHash(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

function toDriverStatus(value: unknown): DriverStatus {
  if (value === DriverStatus.ADDITIONAL_DETAILS_SENT) return DriverStatus.ADDITIONAL_DETAILS_SENT;
  if (value === DriverStatus.ADDITIONAL_DETAILS_COMPLETED) {
    return DriverStatus.ADDITIONAL_DETAILS_COMPLETED;
  }
  if (value === DriverStatus.INTERNAL_DETAILS_SENT) return DriverStatus.INTERNAL_DETAILS_SENT;
  if (value === DriverStatus.INTERNAL_DETAILS_COMPLETED) {
    return DriverStatus.INTERNAL_DETAILS_COMPLETED;
  }
  if (value === DriverStatus.AWAITING_INDUCTION) return DriverStatus.AWAITING_INDUCTION;
  if (value === DriverStatus.WITHDRAWN) return DriverStatus.WITHDRAWN;
  if (value === DriverStatus.REJECTED) return DriverStatus.REJECTED;
  // Legacy values from previous status model.
  if (value === 1) return DriverStatus.ADDITIONAL_DETAILS_SENT;
  if (value === 2) return DriverStatus.AWAITING_INDUCTION;
  if (value === 3) return DriverStatus.REJECTED;
  return DriverStatus.ADDITIONAL_DETAILS_SENT;
}

function toAuditAction(value: unknown): AuditAction {
  if (value === AuditAction.CREATED) return AuditAction.CREATED;
  if (value === AuditAction.STATUS_CHANGED) return AuditAction.STATUS_CHANGED;
  if (value === AuditAction.UPDATED) return AuditAction.UPDATED;
  return AuditAction.UNSPECIFIED;
}

function statusLabel(status: DriverStatus): string {
  if (status === DriverStatus.ADDITIONAL_DETAILS_COMPLETED) {
    return "ADDITIONAL_DETAILS_COMPLETED";
  }
  if (status === DriverStatus.INTERNAL_DETAILS_SENT) return "INTERNAL_DETAILS_SENT";
  if (status === DriverStatus.INTERNAL_DETAILS_COMPLETED) {
    return "INTERNAL_DETAILS_COMPLETED";
  }
  if (status === DriverStatus.AWAITING_INDUCTION) return "AWAITING_INDUCTION";
  if (status === DriverStatus.WITHDRAWN) return "WITHDRAWN";
  if (status === DriverStatus.REJECTED) return "REJECTED";
  return "ADDITIONAL_DETAILS_SENT";
}

function normalizePermission(permission: AdminPermission): AdminPermission {
  if (permission === AdminPermission.MANAGE_ADMINS) return AdminPermission.MANAGE_ADMINS;
  if (permission === AdminPermission.VIEW_DRIVERS) return AdminPermission.VIEW_DRIVERS;
  if (permission === AdminPermission.EDIT_DRIVERS) return AdminPermission.EDIT_DRIVERS;
  if (permission === AdminPermission.VIEW_STATS) return AdminPermission.VIEW_STATS;
  if (permission === AdminPermission.SEND_FORMS) return AdminPermission.SEND_FORMS;
  return AdminPermission.UNSPECIFIED;
}

function normalizeRole(role: AdminRole): AdminRole {
  if (role === AdminRole.SUPER_ADMIN) return AdminRole.SUPER_ADMIN;
  if (role === AdminRole.OPERATIONS) return AdminRole.OPERATIONS;
  if (role === AdminRole.RECRUITER) return AdminRole.RECRUITER;
  if (role === AdminRole.VIEWER) return AdminRole.VIEWER;
  return AdminRole.UNSPECIFIED;
}

function defaultPermissionsForRole(role: AdminRole): AdminPermission[] {
  if (role === AdminRole.SUPER_ADMIN) {
    return [
      AdminPermission.MANAGE_ADMINS,
      AdminPermission.VIEW_DRIVERS,
      AdminPermission.EDIT_DRIVERS,
      AdminPermission.VIEW_STATS,
      AdminPermission.SEND_FORMS,
    ];
  }
  if (role === AdminRole.OPERATIONS) {
    return [
      AdminPermission.VIEW_DRIVERS,
      AdminPermission.EDIT_DRIVERS,
      AdminPermission.VIEW_STATS,
      AdminPermission.SEND_FORMS,
    ];
  }
  if (role === AdminRole.RECRUITER) {
    return [
      AdminPermission.VIEW_DRIVERS,
      AdminPermission.EDIT_DRIVERS,
      AdminPermission.SEND_FORMS,
    ];
  }
  if (role === AdminRole.VIEWER) {
    return [AdminPermission.VIEW_DRIVERS, AdminPermission.VIEW_STATS];
  }
  return [];
}

function uniquePermissions(raw: AdminPermission[]): AdminPermission[] {
  const out: AdminPermission[] = [];
  for (const permission of raw) {
    const normalized = normalizePermission(permission);
    if (normalized === AdminPermission.UNSPECIFIED) {
      continue;
    }
    if (!out.includes(normalized)) {
      out.push(normalized);
    }
  }
  return out;
}

function serializePermissions(perms: AdminPermission[]): string {
  return JSON.stringify(perms);
}

function parsePermissions(value: unknown): AdminPermission[] {
  if (typeof value !== "string" || !value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const raw: AdminPermission[] = [];
    for (const item of parsed) {
      if (typeof item === "number") {
        raw.push(item);
      }
    }
    return uniquePermissions(raw);
  } catch {
    return [];
  }
}

function buildAdminUserFromRow(row: unknown): AdminUser {
  const role = normalizeRole(intValue(objectField(row, "role"), AdminRole.UNSPECIFIED));
  const storedPermissions = parsePermissions(objectField(row, "permissions_json"));
  const permissions =
    storedPermissions.length > 0 ? storedPermissions : defaultPermissionsForRole(role);
  return {
    id: stringValue(objectField(row, "id"), ""),
    email: stringValue(objectField(row, "email"), ""),
    name: stringValue(objectField(row, "name"), ""),
    role,
    permissions,
    createdAt: stringValue(objectField(row, "created_at"), ""),
  };
}

function buildDriverFromRow(row: unknown): Driver {
  return {
    id: stringValue(objectField(row, "id"), ""),
    name: stringValue(objectField(row, "name"), ""),
    firstName: stringValue(objectField(row, "first_name"), ""),
    lastName: stringValue(objectField(row, "last_name"), ""),
    email: stringValue(objectField(row, "email"), ""),
    phone: stringValue(objectField(row, "phone"), ""),
    status: toDriverStatus(
      intValue(objectField(row, "status"), DriverStatus.ADDITIONAL_DETAILS_SENT)
    ),
    appliedAt: stringValue(objectField(row, "applied_at"), ""),
    dateOfBirth: stringValue(objectField(row, "date_of_birth"), ""),
    nationalInsuranceNumber: stringValue(
      objectField(row, "national_insurance_number"),
      ""
    ),
    rightToWorkCheckCode: stringValue(objectField(row, "right_to_work_check_code"), ""),
    inductionDate: stringValue(objectField(row, "induction_date"), ""),
    interviewDate: stringValue(objectField(row, "interview_date"), ""),
    idDocumentType: stringValue(objectField(row, "id_document_type"), ""),
    idDocumentNumber: stringValue(objectField(row, "id_document_number"), ""),
    idCheckCompleted: boolValue(objectField(row, "id_check_completed"), false),
    idCheckCompletedAt: stringValue(objectField(row, "id_check_completed_at"), ""),
    driversLicenseNumber: stringValue(objectField(row, "drivers_license_number"), ""),
    driversLicenseExpiryDate: stringValue(
      objectField(row, "drivers_license_expiry_date"),
      ""
    ),
    addressLine1: stringValue(objectField(row, "address_line_1"), ""),
    addressLine2: stringValue(objectField(row, "address_line_2"), ""),
    city: stringValue(objectField(row, "city"), ""),
    postcode: stringValue(objectField(row, "postcode"), ""),
    emergencyContactName: stringValue(objectField(row, "emergency_contact_name"), ""),
    emergencyContactPhone: stringValue(objectField(row, "emergency_contact_phone"), ""),
    emergencyContactRelationship: stringValue(
      objectField(row, "emergency_contact_relationship"),
      ""
    ),
    vehicleType: stringValue(objectField(row, "vehicle_type"), ""),
    preferredDaysPerWeek: stringValue(objectField(row, "preferred_days_per_week"), ""),
    preferredStartDate: stringValue(objectField(row, "preferred_start_date"), ""),
    detailsConfirmedByDriver: stringValue(
      objectField(row, "details_confirmed_by_driver"),
      ""
    ),
    notes: stringValue(objectField(row, "notes"), ""),
    auditTrail: [],
  };
}

function buildAuditFromRow(row: unknown): AuditEvent {
  return {
    id: stringValue(objectField(row, "id"), ""),
    actor: stringValue(objectField(row, "actor"), ""),
    action: toAuditAction(intValue(objectField(row, "action"), AuditAction.UNSPECIFIED)),
    timestamp: stringValue(objectField(row, "timestamp"), ""),
    field: stringValue(objectField(row, "field"), ""),
    oldValue: stringValue(objectField(row, "old_value"), ""),
    newValue: stringValue(objectField(row, "new_value"), ""),
    note: stringValue(objectField(row, "note"), ""),
  };
}

function seedDrivers(): Driver[] {
  return [
    {
      id: "1",
      name: "Jane Doe",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phone: "+1 555-0101",
      status: DriverStatus.AWAITING_INDUCTION,
      appliedAt: "2025-01-15T10:00:00Z",
      dateOfBirth: "1994-04-11",
      nationalInsuranceNumber: "QQ123456C",
      rightToWorkCheckCode: "RTW-7HF2-K91L",
      inductionDate: "2025-01-22T09:00:00Z",
      interviewDate: "2025-01-18T13:30:00Z",
      idDocumentType: "Passport",
      idDocumentNumber: "569202991",
      idCheckCompleted: true,
      idCheckCompletedAt: "2025-01-19T15:00:00Z",
      driversLicenseNumber: "DOEJA945443A99AB",
      driversLicenseExpiryDate: "2028-07-31",
      addressLine1: "42 King Street",
      addressLine2: "Flat 2",
      city: "Manchester",
      postcode: "M1 1AE",
      emergencyContactName: "Mark Doe",
      emergencyContactPhone: "+44 7700 900111",
      emergencyContactRelationship: "",
      vehicleType: "Car",
      preferredDaysPerWeek: "",
      preferredStartDate: "",
      detailsConfirmedByDriver: "",
      notes: "Prefers morning shifts.",
      auditTrail: [],
    },
    {
      id: "2",
      name: "John Smith",
      firstName: "John",
      lastName: "Smith",
      email: "john@example.com",
      phone: "+1 555-0102",
      status: DriverStatus.ADDITIONAL_DETAILS_SENT,
      appliedAt: "2025-02-01T14:30:00Z",
      dateOfBirth: "1992-08-21",
      nationalInsuranceNumber: "QQ223456D",
      rightToWorkCheckCode: "RTW-1DT9-T2AZ",
      inductionDate: "",
      interviewDate: "2025-02-04T11:00:00Z",
      idDocumentType: "Driving licence",
      idDocumentNumber: "SMI223800",
      idCheckCompleted: false,
      idCheckCompletedAt: "",
      driversLicenseNumber: "SMITH922188JS9CD",
      driversLicenseExpiryDate: "2027-12-01",
      addressLine1: "77 Bridge Road",
      addressLine2: "",
      city: "Leeds",
      postcode: "LS1 4AB",
      emergencyContactName: "Emily Smith",
      emergencyContactPhone: "+44 7700 900222",
      emergencyContactRelationship: "",
      vehicleType: "Van",
      preferredDaysPerWeek: "",
      preferredStartDate: "",
      detailsConfirmedByDriver: "",
      notes: "Needs weekday evening availability.",
      auditTrail: [],
    },
    {
      id: "3",
      name: "Alex Rivera",
      firstName: "Alex",
      lastName: "Rivera",
      email: "alex.rivera@example.com",
      phone: "+1 555-0103",
      status: DriverStatus.ADDITIONAL_DETAILS_COMPLETED,
      appliedAt: "2025-02-10T09:15:00Z",
      dateOfBirth: "1990-02-03",
      nationalInsuranceNumber: "QQ323456E",
      rightToWorkCheckCode: "RTW-L9AT-4P2X",
      inductionDate: "",
      interviewDate: "2025-02-12T10:30:00Z",
      idDocumentType: "National ID",
      idDocumentNumber: "AR-119911",
      idCheckCompleted: false,
      idCheckCompletedAt: "",
      driversLicenseNumber: "RIVER903333AR7QX",
      driversLicenseExpiryDate: "2029-03-09",
      addressLine1: "10 Queen Lane",
      addressLine2: "",
      city: "Liverpool",
      postcode: "L1 2PQ",
      emergencyContactName: "Taylor Rivera",
      emergencyContactPhone: "+44 7700 900333",
      emergencyContactRelationship: "",
      vehicleType: "Bike",
      preferredDaysPerWeek: "",
      preferredStartDate: "",
      detailsConfirmedByDriver: "",
      notes: "Can cover weekend routes.",
      auditTrail: [],
    },
    {
      id: "4",
      name: "Sam Chen",
      firstName: "Sam",
      lastName: "Chen",
      email: "sam.chen@example.com",
      phone: "+1 555-0104",
      status: DriverStatus.REJECTED,
      appliedAt: "2025-01-20T11:00:00Z",
      dateOfBirth: "1988-06-17",
      nationalInsuranceNumber: "QQ423456F",
      rightToWorkCheckCode: "RTW-W8K2-A8R1",
      inductionDate: "",
      interviewDate: "2025-01-23T16:00:00Z",
      idDocumentType: "Passport",
      idDocumentNumber: "772189456",
      idCheckCompleted: true,
      idCheckCompletedAt: "2025-01-22T12:10:00Z",
      driversLicenseNumber: "CHENS883311SC2UV",
      driversLicenseExpiryDate: "2026-10-15",
      addressLine1: "13 Station Place",
      addressLine2: "",
      city: "Bristol",
      postcode: "BS1 5NN",
      emergencyContactName: "Morgan Chen",
      emergencyContactPhone: "+44 7700 900444",
      emergencyContactRelationship: "",
      vehicleType: "Car",
      preferredDaysPerWeek: "",
      preferredStartDate: "",
      detailsConfirmedByDriver: "",
      notes: "Rejected due to expired licence.",
      auditTrail: [],
    },
    {
      id: "5",
      name: "Jordan Lee",
      firstName: "Jordan",
      lastName: "Lee",
      email: "jordan.lee@example.com",
      phone: "+1 555-0105",
      status: DriverStatus.INTERNAL_DETAILS_COMPLETED,
      appliedAt: "2025-02-05T16:45:00Z",
      dateOfBirth: "1996-12-29",
      nationalInsuranceNumber: "QQ523456G",
      rightToWorkCheckCode: "RTW-9PQ3-M5Z8",
      inductionDate: "2025-02-11T09:30:00Z",
      interviewDate: "2025-02-07T14:00:00Z",
      idDocumentType: "Passport",
      idDocumentNumber: "991843201",
      idCheckCompleted: true,
      idCheckCompletedAt: "2025-02-08T10:10:00Z",
      driversLicenseNumber: "LEEJO964422JL1LM",
      driversLicenseExpiryDate: "2030-11-11",
      addressLine1: "8 West End",
      addressLine2: "",
      city: "Birmingham",
      postcode: "B1 1AA",
      emergencyContactName: "Chris Lee",
      emergencyContactPhone: "+44 7700 900555",
      emergencyContactRelationship: "",
      vehicleType: "Car",
      preferredDaysPerWeek: "",
      preferredStartDate: "",
      detailsConfirmedByDriver: "",
      notes: "Strong customer rating in prior role.",
      auditTrail: [],
    },
  ];
}

export class AppDatabase {
  private readonly db: DatabaseSync;

  constructor() {
    mkdirSync(dataDir, { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.initSchema();
    this.seed();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS drivers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        status INTEGER NOT NULL,
        applied_at TEXT NOT NULL,
        date_of_birth TEXT NOT NULL,
        national_insurance_number TEXT NOT NULL,
        right_to_work_check_code TEXT NOT NULL,
        induction_date TEXT NOT NULL,
        interview_date TEXT NOT NULL,
        id_document_type TEXT NOT NULL,
        id_document_number TEXT NOT NULL,
        id_check_completed INTEGER NOT NULL,
        id_check_completed_at TEXT NOT NULL,
        drivers_license_number TEXT NOT NULL,
        drivers_license_expiry_date TEXT NOT NULL,
        address_line_1 TEXT NOT NULL,
        address_line_2 TEXT NOT NULL,
        city TEXT NOT NULL,
        postcode TEXT NOT NULL,
        emergency_contact_name TEXT NOT NULL,
        emergency_contact_phone TEXT NOT NULL,
        emergency_contact_relationship TEXT NOT NULL,
        vehicle_type TEXT NOT NULL,
        preferred_days_per_week TEXT NOT NULL,
        preferred_start_date TEXT NOT NULL,
        details_confirmed_by_driver TEXT NOT NULL,
        notes TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        driver_id TEXT NOT NULL,
        actor TEXT NOT NULL,
        action INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        field TEXT NOT NULL,
        old_value TEXT NOT NULL,
        new_value TEXT NOT NULL,
        note TEXT NOT NULL,
        FOREIGN KEY(driver_id) REFERENCES drivers(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role INTEGER NOT NULL,
        permissions_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES admin_users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS webhook_events (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        event_type TEXT NOT NULL,
        external_event_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL,
        available_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        processed_at TEXT NOT NULL,
        error_message TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_external
      ON webhook_events(provider, external_event_id);
    `);

    this.addColumnIfMissing("admin_users", "role", "INTEGER NOT NULL DEFAULT 1");
    this.addColumnIfMissing("admin_users", "permissions_json", "TEXT NOT NULL DEFAULT '[]'");
    this.addColumnIfMissing(
      "drivers",
      "emergency_contact_relationship",
      "TEXT NOT NULL DEFAULT ''"
    );
    this.addColumnIfMissing("drivers", "preferred_days_per_week", "TEXT NOT NULL DEFAULT ''");
    this.addColumnIfMissing("drivers", "preferred_start_date", "TEXT NOT NULL DEFAULT ''");
    this.addColumnIfMissing(
      "drivers",
      "details_confirmed_by_driver",
      "TEXT NOT NULL DEFAULT ''"
    );

    this.db
      .prepare(
        `UPDATE admin_users SET role = ? WHERE role IS NULL OR role = ?`
      )
      .run(AdminRole.SUPER_ADMIN, AdminRole.UNSPECIFIED);
    this.db
      .prepare(
        `UPDATE admin_users
         SET permissions_json = ?
         WHERE permissions_json IS NULL OR permissions_json = ''`
      )
      .run(serializePermissions(defaultPermissionsForRole(AdminRole.SUPER_ADMIN)));
  }

  private addColumnIfMissing(tableName: string, columnName: string, definition: string): void {
    const rows = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
    let hasColumn = false;
    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (stringValue(objectField(row, "name"), "") === columnName) {
          hasColumn = true;
          break;
        }
      }
    }
    if (!hasColumn) {
      this.db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    }
  }

  private seed(): void {
    const driversCount = intValue(
      objectField(this.db.prepare("SELECT COUNT(*) AS count FROM drivers").get(), "count"),
      0
    );
    if (driversCount === 0) {
      for (const driver of seedDrivers()) {
        this.insertDriver(driver);
        this.insertAudit({
          id: `audit-${driver.id}-1`,
          driverId: driver.id,
          actor: "system",
          action: AuditAction.CREATED,
          timestamp: driver.appliedAt ?? "",
          field: "driver",
          oldValue: "",
          newValue: "created",
          note: "Driver application created",
        });
      }
    }

    const adminCount = intValue(
      objectField(this.db.prepare("SELECT COUNT(*) AS count FROM admin_users").get(), "count"),
      0
    );
    if (adminCount === 0) {
      const salt = randomBytes(16).toString("hex");
      const hash = passwordHash("admin123", salt);
      this.db
        .prepare(
          `INSERT INTO admin_users (
            id, email, name, password_hash, salt, role, permissions_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          "admin-1",
          "admin@driver.app",
          "Admin User",
          hash,
          salt,
          AdminRole.SUPER_ADMIN,
          serializePermissions(defaultPermissionsForRole(AdminRole.SUPER_ADMIN)),
          isoNow()
        );
    }
  }

  private insertDriver(driver: Driver): void {
    this.db
      .prepare(
        `INSERT INTO drivers (
          id, name, first_name, last_name, email, phone, status, applied_at,
          date_of_birth, national_insurance_number, right_to_work_check_code,
          induction_date, interview_date, id_document_type, id_document_number,
          id_check_completed, id_check_completed_at, drivers_license_number,
          drivers_license_expiry_date, address_line_1, address_line_2, city,
          postcode, emergency_contact_name, emergency_contact_phone,
          emergency_contact_relationship, vehicle_type, preferred_days_per_week,
          preferred_start_date, details_confirmed_by_driver, notes, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?
        )`
      )
      .run(
        driver.id,
        driver.name,
        driver.firstName,
        driver.lastName,
        driver.email,
        driver.phone ?? "",
        driver.status,
        driver.appliedAt ?? "",
        driver.dateOfBirth,
        driver.nationalInsuranceNumber,
        driver.rightToWorkCheckCode,
        driver.inductionDate,
        driver.interviewDate,
        driver.idDocumentType,
        driver.idDocumentNumber,
        driver.idCheckCompleted ? 1 : 0,
        driver.idCheckCompletedAt,
        driver.driversLicenseNumber,
        driver.driversLicenseExpiryDate,
        driver.addressLine1,
        driver.addressLine2,
        driver.city,
        driver.postcode,
        driver.emergencyContactName,
        driver.emergencyContactPhone,
        driver.emergencyContactRelationship,
        driver.vehicleType,
        driver.preferredDaysPerWeek,
        driver.preferredStartDate,
        driver.detailsConfirmedByDriver,
        driver.notes,
        isoNow(),
        isoNow()
      );
  }

  private insertAudit(event: {
    id: string;
    driverId: string;
    actor: string;
    action: AuditAction;
    timestamp: string;
    field: string;
    oldValue: string;
    newValue: string;
    note: string;
  }): void {
    this.db
      .prepare(
        `INSERT INTO audit_events (
          id, driver_id, actor, action, timestamp, field, old_value, new_value, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        event.id,
        event.driverId,
        event.actor,
        event.action,
        event.timestamp,
        event.field,
        event.oldValue,
        event.newValue,
        event.note
      );
  }

  private loadAuditTrail(driverId: string): AuditEvent[] {
    const rows = this.db
      .prepare(
        `SELECT id, actor, action, timestamp, field, old_value, new_value, note
         FROM audit_events
         WHERE driver_id = ?
         ORDER BY timestamp DESC, id DESC`
      )
      .all(driverId);

    if (!Array.isArray(rows)) {
      return [];
    }
    return rows.map((row) => buildAuditFromRow(row));
  }

  private loadDriver(id: string): Driver | undefined {
    const row = this.db
      .prepare(`SELECT * FROM drivers WHERE id = ?`)
      .get(id);
    if (!row) {
      return undefined;
    }
    const driver = buildDriverFromRow(row);
    driver.auditTrail = this.loadAuditTrail(driver.id);
    return driver;
  }

  getDriver(id: string): Driver | undefined {
    return this.loadDriver(id);
  }

  createDriver(next: Driver, actor: string): Driver {
    this.insertDriver(next);
    this.insertAudit({
      id: `audit-${next.id}-1`,
      driverId: next.id,
      actor,
      action: AuditAction.CREATED,
      timestamp: isoNow(),
      field: "driver",
      oldValue: "",
      newValue: "created",
      note: "Driver created",
    });
    const created = this.loadDriver(next.id);
    if (!created) {
      throw new Error("Failed to create driver");
    }
    return created;
  }

  listDrivers(request: ListDriversRequest): ListDriversResponse {
    const pageSize = request.pageSize && request.pageSize > 0 ? request.pageSize : 10;
    const pageToken = request.pageToken ?? "";
    const rows = this.db
      .prepare(
        `SELECT * FROM drivers
         WHERE (? = '' OR id > ?)
         ORDER BY id ASC
         LIMIT ?`
      )
      .all(pageToken, pageToken, pageSize);

    const drivers: Driver[] = [];
    if (Array.isArray(rows)) {
      for (const row of rows) {
        const driver = buildDriverFromRow(row);
        driver.auditTrail = this.loadAuditTrail(driver.id);
        drivers.push(driver);
      }
    }

    const nextPageToken = drivers.length === pageSize ? drivers[drivers.length - 1].id : "";
    return { drivers, nextPageToken };
  }

  getDriversByFilters(request: GetDriversByFiltersRequest): GetDriversByFiltersResponse {
    const pageSize = request.pageSize && request.pageSize > 0 ? request.pageSize : 20;
    const pageToken = request.pageToken ?? "";
    const search = (request.search ?? "").trim().toLowerCase();
    const statusFilter = request.statusFilter;

    const rows = this.db
      .prepare(
        `SELECT * FROM drivers
         WHERE
          (? = '' OR id > ?)
          AND (? IS NULL OR status = ?)
          AND (
            ? = '' OR
            lower(name) LIKE '%' || ? || '%' OR
            lower(first_name) LIKE '%' || ? || '%' OR
            lower(last_name) LIKE '%' || ? || '%' OR
            lower(email) LIKE '%' || ? || '%' OR
            lower(phone) LIKE '%' || ? || '%' OR
            lower(drivers_license_number) LIKE '%' || ? || '%' OR
            lower(national_insurance_number) LIKE '%' || ? || '%' OR
            lower(postcode) LIKE '%' || ? || '%'
          )
         ORDER BY id ASC
         LIMIT ?`
      )
      .all(
        pageToken,
        pageToken,
        statusFilter ?? null,
        statusFilter ?? null,
        search,
        search,
        search,
        search,
        search,
        search,
        search,
        search,
        search,
        pageSize
      );

    const drivers: Driver[] = [];
    if (Array.isArray(rows)) {
      for (const row of rows) {
        const driver = buildDriverFromRow(row);
        driver.auditTrail = this.loadAuditTrail(driver.id);
        drivers.push(driver);
      }
    }

    const nextPageToken = drivers.length === pageSize ? drivers[drivers.length - 1].id : "";
    return { drivers, nextPageToken };
  }

  batchGetDrivers(ids: string[]): Driver[] {
    if (ids.length === 0) {
      return [];
    }
    const out: Driver[] = [];
    for (const id of ids) {
      const driver = this.loadDriver(id);
      if (driver) {
        out.push(driver);
      }
    }
    return out;
  }

  getDriverStats(request: GetDriverStatsRequest): GetDriverStatsResponse {
    const filtered = this.getDriversByFilters({
      pageSize: 10000,
      pageToken: "",
      statusFilter: request.statusFilter,
      search: request.search,
    }).drivers;

    const byStatus: Record<string, number> = {
      ADDITIONAL_DETAILS_SENT: 0,
      ADDITIONAL_DETAILS_COMPLETED: 0,
      INTERNAL_DETAILS_SENT: 0,
      INTERNAL_DETAILS_COMPLETED: 0,
      AWAITING_INDUCTION: 0,
      WITHDRAWN: 0,
      REJECTED: 0,
    };

    for (const driver of filtered) {
      const label = statusLabel(driver.status);
      byStatus[label] = byStatus[label] + 1;
    }

    return {
      byStatus,
      total: filtered.length,
    };
  }

  updateDriver(next: Driver, actor: string): Driver | undefined {
    const current = this.loadDriver(next.id);
    if (!current) {
      return undefined;
    }

    this.db
      .prepare(
        `UPDATE drivers SET
          name = ?,
          first_name = ?,
          last_name = ?,
          email = ?,
          phone = ?,
          status = ?,
          applied_at = ?,
          date_of_birth = ?,
          national_insurance_number = ?,
          right_to_work_check_code = ?,
          induction_date = ?,
          interview_date = ?,
          id_document_type = ?,
          id_document_number = ?,
          id_check_completed = ?,
          id_check_completed_at = ?,
          drivers_license_number = ?,
          drivers_license_expiry_date = ?,
          address_line_1 = ?,
          address_line_2 = ?,
          city = ?,
          postcode = ?,
          emergency_contact_name = ?,
          emergency_contact_phone = ?,
          emergency_contact_relationship = ?,
          vehicle_type = ?,
          preferred_days_per_week = ?,
          preferred_start_date = ?,
          details_confirmed_by_driver = ?,
          notes = ?,
          updated_at = ?
         WHERE id = ?`
      )
      .run(
        next.name,
        next.firstName,
        next.lastName,
        next.email,
        next.phone ?? "",
        next.status,
        next.appliedAt ?? "",
        next.dateOfBirth,
        next.nationalInsuranceNumber,
        next.rightToWorkCheckCode,
        next.inductionDate,
        next.interviewDate,
        next.idDocumentType,
        next.idDocumentNumber,
        next.idCheckCompleted ? 1 : 0,
        next.idCheckCompletedAt,
        next.driversLicenseNumber,
        next.driversLicenseExpiryDate,
        next.addressLine1,
        next.addressLine2,
        next.city,
        next.postcode,
        next.emergencyContactName,
        next.emergencyContactPhone,
        next.emergencyContactRelationship,
        next.vehicleType,
        next.preferredDaysPerWeek,
        next.preferredStartDate,
        next.detailsConfirmedByDriver,
        next.notes,
        isoNow(),
        next.id
      );

    const trackedFields: Array<keyof Driver> = [
      "name",
      "firstName",
      "lastName",
      "email",
      "phone",
      "status",
      "appliedAt",
      "dateOfBirth",
      "nationalInsuranceNumber",
      "rightToWorkCheckCode",
      "inductionDate",
      "interviewDate",
      "idDocumentType",
      "idDocumentNumber",
      "idCheckCompleted",
      "idCheckCompletedAt",
      "driversLicenseNumber",
      "driversLicenseExpiryDate",
      "addressLine1",
      "addressLine2",
      "city",
      "postcode",
      "emergencyContactName",
      "emergencyContactPhone",
      "emergencyContactRelationship",
      "vehicleType",
      "preferredDaysPerWeek",
      "preferredStartDate",
      "detailsConfirmedByDriver",
      "notes",
    ];

    let changeIndex = this.auditCount(next.id) + 1;
    for (const field of trackedFields) {
      const previousValue = String(current[field]);
      const nextValue = String(next[field]);
      if (previousValue === nextValue) {
        continue;
      }
      const eventId = `audit-${next.id}-${changeIndex}`;
      changeIndex += 1;
      this.insertAudit({
        id: eventId,
        driverId: next.id,
        actor,
        action: field === "status" ? AuditAction.STATUS_CHANGED : AuditAction.UPDATED,
        timestamp: isoNow(),
        field,
        oldValue: previousValue,
        newValue: nextValue,
        note:
          field === "status"
            ? `Status changed from ${previousValue} to ${nextValue}`
            : `${field} updated`,
      });
    }

    return this.loadDriver(next.id);
  }

  private auditCount(driverId: string): number {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS count FROM audit_events WHERE driver_id = ?`)
      .get(driverId);
    return intValue(objectField(row, "count"), 0);
  }

  login(request: LoginRequest): LoginResponse | undefined {
    const row = this.db
      .prepare(
        `SELECT id, email, name, password_hash, salt, role, permissions_json, created_at
         FROM admin_users
         WHERE lower(email) = lower(?)`
      )
      .get(request.email);
    if (!row) {
      return undefined;
    }

    const salt = stringValue(objectField(row, "salt"), "");
    const expected = stringValue(objectField(row, "password_hash"), "");
    const actual = passwordHash(request.password, salt);
    if (actual !== expected) {
      return undefined;
    }

    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    const userId = stringValue(objectField(row, "id"), "");

    this.db
      .prepare(`INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`)
      .run(token, userId, expiresAt, isoNow());

    const user = buildAdminUserFromRow(row);

    return {
      token,
      expiresAt,
      user,
    };
  }

  validateSession(request: ValidateSessionRequest): ValidateSessionResponse {
    const row = this.db
      .prepare(
        `SELECT s.expires_at, u.id, u.email, u.name, u.role, u.permissions_json, u.created_at
         FROM sessions s
         JOIN admin_users u ON u.id = s.user_id
         WHERE s.token = ?`
      )
      .get(request.token);

    if (!row) {
      return { valid: false, expiresAt: "" };
    }

    const expiresAt = stringValue(objectField(row, "expires_at"), "");
    if (!expiresAt || Date.parse(expiresAt) <= Date.now()) {
      this.db.prepare(`DELETE FROM sessions WHERE token = ?`).run(request.token);
      return { valid: false, expiresAt: "" };
    }

    return {
      valid: true,
      expiresAt,
      user: buildAdminUserFromRow(row),
    };
  }

  logout(request: LogoutRequest): LogoutResponse {
    const result = this.db.prepare(`DELETE FROM sessions WHERE token = ?`).run(request.token);
    const changes = intValue(objectField(result, "changes"), 0);
    return { success: changes > 0 };
  }

  findDriverByEmail(email: string): Driver | undefined {
    const row = this.db
      .prepare(`SELECT id FROM drivers WHERE lower(email) = lower(?) LIMIT 1`)
      .get(email);
    const id = stringValue(objectField(row, "id"), "");
    if (!id) {
      return undefined;
    }
    return this.loadDriver(id);
  }

  enqueueWebhookEvent(input: {
    provider: string;
    eventType: string;
    externalEventId: string;
    payload: unknown;
  }): { queued: boolean; eventId: string; duplicate: boolean } {
    const id = `wh-${randomBytes(10).toString("hex")}`;
    const now = isoNow();
    const payloadJson = JSON.stringify(input.payload);
    try {
      this.db
        .prepare(
          `INSERT INTO webhook_events (
            id, provider, event_type, external_event_id, payload_json,
            status, attempts, available_at, created_at, processed_at, error_message
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          input.provider,
          input.eventType,
          input.externalEventId,
          payloadJson,
          "PENDING",
          0,
          now,
          now,
          "",
          ""
        );
      return { queued: true, eventId: id, duplicate: false };
    } catch (error) {
      const code = stringValue(objectField(error, "code"), "");
      if (code === "SQLITE_CONSTRAINT_UNIQUE") {
        const row = this.db
          .prepare(
            `SELECT id FROM webhook_events WHERE provider = ? AND external_event_id = ?`
          )
          .get(input.provider, input.externalEventId);
        return {
          queued: false,
          eventId: stringValue(objectField(row, "id"), ""),
          duplicate: true,
        };
      }
      throw error;
    }
  }

  claimNextWebhookEvent(provider: string): WebhookEvent | undefined {
    const now = isoNow();
    const row = this.db
      .prepare(
        `SELECT id, provider, event_type, external_event_id, payload_json, attempts
         FROM webhook_events
         WHERE provider = ? AND status = 'PENDING' AND available_at <= ?
         ORDER BY created_at ASC
         LIMIT 1`
      )
      .get(provider, now);
    if (!row) {
      return undefined;
    }

    const id = stringValue(objectField(row, "id"), "");
    const nextAttempts = intValue(objectField(row, "attempts"), 0) + 1;
    this.db
      .prepare(
        `UPDATE webhook_events
         SET status = 'PROCESSING', attempts = ?
         WHERE id = ?`
      )
      .run(nextAttempts, id);

    const payloadRaw = stringValue(objectField(row, "payload_json"), "{}");
    let payload: unknown = {};
    try {
      payload = JSON.parse(payloadRaw);
    } catch {
      payload = {};
    }

    return {
      id,
      provider: stringValue(objectField(row, "provider"), ""),
      eventType: stringValue(objectField(row, "event_type"), ""),
      externalEventId: stringValue(objectField(row, "external_event_id"), ""),
      payload,
      attempts: nextAttempts,
    };
  }

  markWebhookEventProcessed(eventId: string): void {
    this.db
      .prepare(
        `UPDATE webhook_events
         SET status = 'PROCESSED', processed_at = ?, error_message = ''
         WHERE id = ?`
      )
      .run(isoNow(), eventId);
  }

  markWebhookEventFailed(eventId: string, message: string, attempts: number): void {
    const isTerminal = attempts >= 5;
    const nextAvailable = new Date(
      Date.now() + Math.min(60, Math.max(5, attempts * 5)) * 1000
    ).toISOString();
    this.db
      .prepare(
        `UPDATE webhook_events
         SET status = ?, available_at = ?, error_message = ?
         WHERE id = ?`
      )
      .run(isTerminal ? "FAILED" : "PENDING", nextAvailable, message, eventId);
  }

  listWebhookEvents(request: ListWebhookEventsRequest): ListWebhookEventsResponse {
    const provider = (request.provider ?? "").trim().toLowerCase();
    const requestedLimit = request.limit ?? 50;
    const limit =
      requestedLimit > 0 ? Math.min(200, Math.trunc(requestedLimit)) : 50;
    const rows = this.db
      .prepare(
        `SELECT id, provider, event_type, external_event_id, status, attempts, created_at, processed_at, error_message
         FROM webhook_events
         WHERE (? = '' OR provider = ?)
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .all(provider, provider, limit);
    if (!Array.isArray(rows)) {
      return { events: [] };
    }
    const events: WebhookEventSummary[] = rows.map((row) => ({
      id: stringValue(objectField(row, "id"), ""),
      provider: stringValue(objectField(row, "provider"), ""),
      eventName: stringValue(objectField(row, "event_type"), ""),
      externalEventId: stringValue(objectField(row, "external_event_id"), ""),
      status: stringValue(objectField(row, "status"), ""),
      attempts: intValue(objectField(row, "attempts"), 0),
      createdAt: stringValue(objectField(row, "created_at"), ""),
      processedAt: stringValue(objectField(row, "processed_at"), ""),
      errorMessage: stringValue(objectField(row, "error_message"), ""),
    }));
    return { events };
  }

  listAdmins(): ListAdminsResponse {
    const rows = this.db
      .prepare(
        `SELECT id, email, name, role, permissions_json, created_at
         FROM admin_users
         ORDER BY created_at DESC, email ASC`
      )
      .all();
    if (!Array.isArray(rows)) {
      return { admins: [] };
    }
    const admins: AdminUser[] = [];
    for (const row of rows) {
      admins.push(buildAdminUserFromRow(row));
    }
    return { admins };
  }

  getAdmin(request: GetAdminRequest): GetAdminResponse {
    const row = this.db
      .prepare(
        `SELECT id, email, name, role, permissions_json, created_at
         FROM admin_users
         WHERE id = ?`
      )
      .get(request.id);
    if (!row) {
      return { admin: undefined };
    }
    return { admin: buildAdminUserFromRow(row) };
  }

  createAdmin(request: CreateAdminRequest): CreateAdminResponse {
    const id = `admin-${randomBytes(8).toString("hex")}`;
    const salt = randomBytes(16).toString("hex");
    const hash = passwordHash(request.password, salt);
    const role = normalizeRole(request.role);
    const permissions = uniquePermissions(
      request.permissions.length > 0
        ? request.permissions
        : defaultPermissionsForRole(role)
    );
    const createdAt = isoNow();

    this.db
      .prepare(
        `INSERT INTO admin_users (
          id, email, name, password_hash, salt, role, permissions_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        request.email,
        request.name,
        hash,
        salt,
        role,
        serializePermissions(permissions),
        createdAt
      );

    return {
      admin: {
        id,
        email: request.email,
        name: request.name,
        role,
        permissions,
        createdAt,
      },
    };
  }

  updateAdminAccess(request: UpdateAdminAccessRequest): UpdateAdminAccessResponse {
    const existing = this.getAdmin({ id: request.id }).admin;
    if (!existing) {
      return { admin: undefined };
    }

    const role = normalizeRole(request.role);
    const permissions = uniquePermissions(
      request.permissions.length > 0
        ? request.permissions
        : defaultPermissionsForRole(role)
    );

    this.db
      .prepare(
        `UPDATE admin_users
         SET role = ?, permissions_json = ?
         WHERE id = ?`
      )
      .run(role, serializePermissions(permissions), request.id);

    return {
      admin: {
        ...existing,
        role,
        permissions,
      },
    };
  }

  deleteAdmin(request: DeleteAdminRequest): DeleteAdminResponse {
    const result = this.db
      .prepare(`DELETE FROM admin_users WHERE id = ?`)
      .run(request.id);
    const changes = intValue(objectField(result, "changes"), 0);
    return { success: changes > 0 };
  }
}

export function createAppDatabase(): AppDatabase {
  return new AppDatabase();
}
