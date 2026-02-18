import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";
import type { Pool as PgPool, PoolClient } from "pg";
import {
  AdminPermission,
  AdminRole,
  AuditAction,
  DriverStatus,
  type AdminUser,
  type CreateAdminRequest,
  type CreateAdminResponse,
  type DeleteAdminRequest,
  type DeleteAdminResponse,
  type GetAdminRequest,
  type GetAdminResponse,
  type GetDriverStatsRequest,
  type GetDriverStatsResponse,
  type GetDriversByFiltersRequest,
  type GetDriversByFiltersResponse,
  type ListAdminsResponse,
  type ListDriversRequest,
  type ListDriversResponse,
  type ListWebhookEventsRequest,
  type ListWebhookEventsResponse,
  type LoginRequest,
  type LoginResponse,
  type LogoutRequest,
  type LogoutResponse,
  type UpdateAdminAccessRequest,
  type UpdateAdminAccessResponse,
  type ValidateSessionRequest,
  type ValidateSessionResponse,
  type AuditEvent,
  type Driver,
  type WebhookEventSummary,
} from "@driver-onboarding/proto";
import type { DatabaseAdapter } from "./db-adapter.js";
import type { WebhookEvent } from "./db.js";

const { Pool } = pg;

function isoNow(): string {
  return new Date().toISOString();
}

function passwordHash(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

function toDriverStatus(value: unknown): DriverStatus {
  if (value === DriverStatus.APPROVED) return DriverStatus.APPROVED;
  if (value === DriverStatus.REJECTED) return DriverStatus.REJECTED;
  return DriverStatus.PENDING;
}

function toAuditAction(value: unknown): AuditAction {
  if (value === AuditAction.CREATED) return AuditAction.CREATED;
  if (value === AuditAction.STATUS_CHANGED) return AuditAction.STATUS_CHANGED;
  if (value === AuditAction.UPDATED) return AuditAction.UPDATED;
  return AuditAction.UNSPECIFIED;
}

function statusLabel(status: DriverStatus): string {
  if (status === DriverStatus.APPROVED) return "APPROVED";
  if (status === DriverStatus.REJECTED) return "REJECTED";
  return "PENDING";
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

function buildAdminUserFromRow(row: Record<string, unknown>): AdminUser {
  const role = normalizeRole(Number(row.role ?? 0));
  const storedPermissions = parsePermissions(String(row.permissions_json ?? "[]"));
  const permissions =
    storedPermissions.length > 0 ? storedPermissions : defaultPermissionsForRole(role);
  return {
    id: String(row.id ?? ""),
    email: String(row.email ?? ""),
    name: String(row.name ?? ""),
    role,
    permissions,
    createdAt: String(row.created_at ?? ""),
  };
}

function buildDriverFromRow(row: Record<string, unknown>): Driver {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    firstName: String(row.first_name ?? ""),
    lastName: String(row.last_name ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    status: toDriverStatus(Number(row.status ?? 1)),
    appliedAt: String(row.applied_at ?? ""),
    dateOfBirth: String(row.date_of_birth ?? ""),
    nationalInsuranceNumber: String(row.national_insurance_number ?? ""),
    rightToWorkCheckCode: String(row.right_to_work_check_code ?? ""),
    inductionDate: String(row.induction_date ?? ""),
    interviewDate: String(row.interview_date ?? ""),
    idDocumentType: String(row.id_document_type ?? ""),
    idDocumentNumber: String(row.id_document_number ?? ""),
    idCheckCompleted: Number(row.id_check_completed ?? 0) !== 0,
    idCheckCompletedAt: String(row.id_check_completed_at ?? ""),
    driversLicenseNumber: String(row.drivers_license_number ?? ""),
    driversLicenseExpiryDate: String(row.drivers_license_expiry_date ?? ""),
    addressLine1: String(row.address_line_1 ?? ""),
    addressLine2: String(row.address_line_2 ?? ""),
    city: String(row.city ?? ""),
    postcode: String(row.postcode ?? ""),
    emergencyContactName: String(row.emergency_contact_name ?? ""),
    emergencyContactPhone: String(row.emergency_contact_phone ?? ""),
    vehicleType: String(row.vehicle_type ?? ""),
    notes: String(row.notes ?? ""),
    auditTrail: [],
  };
}

function buildAuditFromRow(row: Record<string, unknown>): AuditEvent {
  return {
    id: String(row.id ?? ""),
    actor: String(row.actor ?? ""),
    action: toAuditAction(Number(row.action ?? 0)),
    timestamp: String(row.timestamp ?? ""),
    field: String(row.field ?? ""),
    oldValue: String(row.old_value ?? ""),
    newValue: String(row.new_value ?? ""),
    note: String(row.note ?? ""),
  };
}

class PostgresDatabase implements DatabaseAdapter {
  private readonly pool: PgPool;
  private readonly ready: Promise<void>;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    await this.pool.query(`
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
        vehicle_type TEXT NOT NULL,
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
        role INTEGER NOT NULL DEFAULT 1,
        permissions_json TEXT NOT NULL DEFAULT '[]',
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

    const existing = await this.pool.query("SELECT COUNT(*)::int AS count FROM admin_users");
    if ((existing.rows[0]?.count ?? 0) === 0) {
      const salt = randomBytes(16).toString("hex");
      const hash = passwordHash("admin123", salt);
      await this.pool.query(
        `INSERT INTO admin_users (
          id, email, name, password_hash, salt, role, permissions_json, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          "admin-1",
          "admin@driver.app",
          "Admin User",
          hash,
          salt,
          AdminRole.SUPER_ADMIN,
          serializePermissions(defaultPermissionsForRole(AdminRole.SUPER_ADMIN)),
          isoNow(),
        ]
      );
    }
  }

  private async client(): Promise<PoolClient> {
    await this.ready;
    return this.pool.connect();
  }

  private async loadAuditTrail(driverId: string): Promise<AuditEvent[]> {
    const result = await this.pool.query(
      `SELECT id, actor, action, timestamp, field, old_value, new_value, note
       FROM audit_events
       WHERE driver_id = $1
       ORDER BY timestamp DESC, id DESC`,
      [driverId]
    );
    return result.rows.map((row: Record<string, unknown>) => buildAuditFromRow(row));
  }

  private async loadDriver(id: string): Promise<Driver | undefined> {
    const result = await this.pool.query(`SELECT * FROM drivers WHERE id = $1`, [id]);
    const row = result.rows[0];
    if (!row) {
      return undefined;
    }
    const driver = buildDriverFromRow(row);
    driver.auditTrail = await this.loadAuditTrail(driver.id);
    return driver;
  }

  async getDriver(id: string): Promise<Driver | undefined> {
    return this.loadDriver(id);
  }

  async listDrivers(request: ListDriversRequest): Promise<ListDriversResponse> {
    const pageSize = request.pageSize && request.pageSize > 0 ? request.pageSize : 10;
    const pageToken = request.pageToken ?? "";
    const rows = await this.pool.query(
      `SELECT * FROM drivers
       WHERE ($1 = '' OR id > $1)
       ORDER BY id ASC
       LIMIT $2`,
      [pageToken, pageSize]
    );
    const drivers: Driver[] = [];
    for (const row of rows.rows) {
      const driver = buildDriverFromRow(row);
      driver.auditTrail = await this.loadAuditTrail(driver.id);
      drivers.push(driver);
    }
    const nextPageToken = drivers.length === pageSize ? drivers[drivers.length - 1].id : "";
    return { drivers, nextPageToken };
  }

  async getDriversByFilters(
    request: GetDriversByFiltersRequest
  ): Promise<GetDriversByFiltersResponse> {
    const pageSize = request.pageSize && request.pageSize > 0 ? request.pageSize : 20;
    const pageToken = request.pageToken ?? "";
    const search = (request.search ?? "").trim().toLowerCase();
    const statusFilter = request.statusFilter ?? null;
    const rows = await this.pool.query(
      `SELECT * FROM drivers
       WHERE ($1 = '' OR id > $1)
         AND ($2::int IS NULL OR status = $2::int)
         AND (
           $3 = '' OR
           lower(name) LIKE '%' || $3 || '%' OR
           lower(first_name) LIKE '%' || $3 || '%' OR
           lower(last_name) LIKE '%' || $3 || '%' OR
           lower(email) LIKE '%' || $3 || '%' OR
           lower(phone) LIKE '%' || $3 || '%' OR
           lower(drivers_license_number) LIKE '%' || $3 || '%' OR
           lower(national_insurance_number) LIKE '%' || $3 || '%' OR
           lower(postcode) LIKE '%' || $3 || '%'
         )
       ORDER BY id ASC
       LIMIT $4`,
      [pageToken, statusFilter, search, pageSize]
    );
    const drivers: Driver[] = [];
    for (const row of rows.rows) {
      const driver = buildDriverFromRow(row);
      driver.auditTrail = await this.loadAuditTrail(driver.id);
      drivers.push(driver);
    }
    const nextPageToken = drivers.length === pageSize ? drivers[drivers.length - 1].id : "";
    return { drivers, nextPageToken };
  }

  async batchGetDrivers(ids: string[]): Promise<Driver[]> {
    if (ids.length === 0) {
      return [];
    }
    const out: Driver[] = [];
    for (const id of ids) {
      const driver = await this.loadDriver(id);
      if (driver) {
        out.push(driver);
      }
    }
    return out;
  }

  async getDriverStats(request: GetDriverStatsRequest): Promise<GetDriverStatsResponse> {
    const filtered = await this.getDriversByFilters({
      pageSize: 10000,
      pageToken: "",
      statusFilter: request.statusFilter,
      search: request.search,
    });
    const byStatus: Record<string, number> = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    };
    for (const driver of filtered.drivers) {
      const label = statusLabel(driver.status);
      byStatus[label] = byStatus[label] + 1;
    }
    return {
      byStatus,
      total: filtered.drivers.length,
    };
  }

  private async auditCount(driverId: string): Promise<number> {
    const row = await this.pool.query(
      `SELECT COUNT(*)::int AS count FROM audit_events WHERE driver_id = $1`,
      [driverId]
    );
    return Number(row.rows[0]?.count ?? 0);
  }

  async updateDriver(next: Driver, actor: string): Promise<Driver | undefined> {
    const current = await this.loadDriver(next.id);
    if (!current) {
      return undefined;
    }

    await this.pool.query(
      `UPDATE drivers SET
        name = $1,
        first_name = $2,
        last_name = $3,
        email = $4,
        phone = $5,
        status = $6,
        applied_at = $7,
        date_of_birth = $8,
        national_insurance_number = $9,
        right_to_work_check_code = $10,
        induction_date = $11,
        interview_date = $12,
        id_document_type = $13,
        id_document_number = $14,
        id_check_completed = $15,
        id_check_completed_at = $16,
        drivers_license_number = $17,
        drivers_license_expiry_date = $18,
        address_line_1 = $19,
        address_line_2 = $20,
        city = $21,
        postcode = $22,
        emergency_contact_name = $23,
        emergency_contact_phone = $24,
        vehicle_type = $25,
        notes = $26,
        updated_at = $27
       WHERE id = $28`,
      [
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
        next.vehicleType,
        next.notes,
        isoNow(),
        next.id,
      ]
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
      "vehicleType",
      "notes",
    ];
    let changeIndex = (await this.auditCount(next.id)) + 1;
    for (const field of trackedFields) {
      const previousValue = String(current[field]);
      const nextValue = String(next[field]);
      if (previousValue === nextValue) {
        continue;
      }
      const eventId = `audit-${next.id}-${changeIndex}`;
      changeIndex += 1;
      await this.pool.query(
        `INSERT INTO audit_events (
          id, driver_id, actor, action, timestamp, field, old_value, new_value, note
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          eventId,
          next.id,
          actor,
          field === "status" ? AuditAction.STATUS_CHANGED : AuditAction.UPDATED,
          isoNow(),
          field,
          previousValue,
          nextValue,
          field === "status"
            ? `Status changed from ${previousValue} to ${nextValue}`
            : `${field} updated`,
        ]
      );
    }
    return this.loadDriver(next.id);
  }

  async login(request: LoginRequest): Promise<LoginResponse | undefined> {
    const result = await this.pool.query(
      `SELECT id, email, name, password_hash, salt, role, permissions_json, created_at
       FROM admin_users
       WHERE lower(email) = lower($1)`,
      [request.email]
    );
    const row = result.rows[0];
    if (!row) {
      return undefined;
    }
    const actual = passwordHash(request.password, String(row.salt ?? ""));
    if (actual !== String(row.password_hash ?? "")) {
      return undefined;
    }
    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    await this.pool.query(
      `INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4)`,
      [token, row.id, expiresAt, isoNow()]
    );
    return {
      token,
      expiresAt,
      user: buildAdminUserFromRow(row),
    };
  }

  async validateSession(request: ValidateSessionRequest): Promise<ValidateSessionResponse> {
    const result = await this.pool.query(
      `SELECT s.expires_at, u.id, u.email, u.name, u.role, u.permissions_json, u.created_at
       FROM sessions s
       JOIN admin_users u ON u.id = s.user_id
       WHERE s.token = $1`,
      [request.token]
    );
    const row = result.rows[0];
    if (!row) {
      return { valid: false, expiresAt: "" };
    }
    const expiresAt = String(row.expires_at ?? "");
    if (!expiresAt || Date.parse(expiresAt) <= Date.now()) {
      await this.pool.query(`DELETE FROM sessions WHERE token = $1`, [request.token]);
      return { valid: false, expiresAt: "" };
    }
    return { valid: true, expiresAt, user: buildAdminUserFromRow(row) };
  }

  async logout(request: LogoutRequest): Promise<LogoutResponse> {
    const result = await this.pool.query(`DELETE FROM sessions WHERE token = $1`, [request.token]);
    return { success: (result.rowCount ?? 0) > 0 };
  }

  async listAdmins(): Promise<ListAdminsResponse> {
    const rows = await this.pool.query(
      `SELECT id, email, name, role, permissions_json, created_at
       FROM admin_users
       ORDER BY created_at DESC, email ASC`
    );
    return {
      admins: rows.rows.map((row: Record<string, unknown>) => buildAdminUserFromRow(row)),
    };
  }

  async getAdmin(request: GetAdminRequest): Promise<GetAdminResponse> {
    const rows = await this.pool.query(
      `SELECT id, email, name, role, permissions_json, created_at
       FROM admin_users
       WHERE id = $1`,
      [request.id]
    );
    const row = rows.rows[0];
    return { admin: row ? buildAdminUserFromRow(row) : undefined };
  }

  async createAdmin(request: CreateAdminRequest): Promise<CreateAdminResponse> {
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
    await this.pool.query(
      `INSERT INTO admin_users (
        id, email, name, password_hash, salt, role, permissions_json, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        request.email,
        request.name,
        hash,
        salt,
        role,
        serializePermissions(permissions),
        createdAt,
      ]
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

  async updateAdminAccess(
    request: UpdateAdminAccessRequest
  ): Promise<UpdateAdminAccessResponse> {
    const existing = (await this.getAdmin({ id: request.id })).admin;
    if (!existing) {
      return { admin: undefined };
    }
    const role = normalizeRole(request.role);
    const permissions = uniquePermissions(
      request.permissions.length > 0
        ? request.permissions
        : defaultPermissionsForRole(role)
    );
    await this.pool.query(
      `UPDATE admin_users SET role = $1, permissions_json = $2 WHERE id = $3`,
      [role, serializePermissions(permissions), request.id]
    );
    return {
      admin: {
        ...existing,
        role,
        permissions,
      },
    };
  }

  async deleteAdmin(request: DeleteAdminRequest): Promise<DeleteAdminResponse> {
    const result = await this.pool.query(`DELETE FROM admin_users WHERE id = $1`, [request.id]);
    return { success: (result.rowCount ?? 0) > 0 };
  }

  async findDriverByEmail(email: string): Promise<Driver | undefined> {
    const result = await this.pool.query(
      `SELECT id FROM drivers WHERE lower(email) = lower($1) LIMIT 1`,
      [email]
    );
    const id = String(result.rows[0]?.id ?? "");
    if (!id) {
      return undefined;
    }
    return this.loadDriver(id);
  }

  async listWebhookEvents(
    request: ListWebhookEventsRequest
  ): Promise<ListWebhookEventsResponse> {
    const provider = (request.provider ?? "").trim().toLowerCase();
    const requestedLimit = request.limit ?? 50;
    const limit =
      requestedLimit > 0 ? Math.min(200, Math.trunc(requestedLimit)) : 50;
    const result = await this.pool.query(
      `SELECT id, provider, event_type, external_event_id, status, attempts, created_at, processed_at, error_message
       FROM webhook_events
       WHERE ($1 = '' OR provider = $1)
       ORDER BY created_at DESC
       LIMIT $2`,
      [provider, limit]
    );
    const events: WebhookEventSummary[] = result.rows.map((row) => ({
      id: String(row.id ?? ""),
      provider: String(row.provider ?? ""),
      eventName: String(row.event_type ?? ""),
      externalEventId: String(row.external_event_id ?? ""),
      status: String(row.status ?? ""),
      attempts: Number(row.attempts ?? 0),
      createdAt: String(row.created_at ?? ""),
      processedAt: String(row.processed_at ?? ""),
      errorMessage: String(row.error_message ?? ""),
    }));
    return { events };
  }

  async enqueueWebhookEvent(input: {
    provider: string;
    eventType: string;
    externalEventId: string;
    payload: unknown;
  }): Promise<{ queued: boolean; eventId: string; duplicate: boolean }> {
    const id = `wh-${randomBytes(10).toString("hex")}`;
    const now = isoNow();
    try {
      await this.pool.query(
        `INSERT INTO webhook_events (
          id, provider, event_type, external_event_id, payload_json,
          status, attempts, available_at, created_at, processed_at, error_message
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          id,
          input.provider,
          input.eventType,
          input.externalEventId,
          JSON.stringify(input.payload),
          "PENDING",
          0,
          now,
          now,
          "",
          "",
        ]
      );
      return { queued: true, eventId: id, duplicate: false };
    } catch (error) {
      const code = String((error as { code?: string }).code ?? "");
      if (code === "23505") {
        const existing = await this.pool.query(
          `SELECT id FROM webhook_events WHERE provider = $1 AND external_event_id = $2`,
          [input.provider, input.externalEventId]
        );
        return {
          queued: false,
          eventId: String(existing.rows[0]?.id ?? ""),
          duplicate: true,
        };
      }
      throw error;
    }
  }

  async claimNextWebhookEvent(provider: string): Promise<WebhookEvent | undefined> {
    const now = isoNow();
    const client = await this.client();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `SELECT id, provider, event_type, external_event_id, payload_json, attempts
         FROM webhook_events
         WHERE provider = $1 AND status = 'PENDING' AND available_at <= $2
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED`,
        [provider, now]
      );
      const row = result.rows[0];
      if (!row) {
        await client.query("COMMIT");
        return undefined;
      }
      const attempts = Number(row.attempts ?? 0) + 1;
      await client.query(
        `UPDATE webhook_events SET status = 'PROCESSING', attempts = $1 WHERE id = $2`,
        [attempts, row.id]
      );
      await client.query("COMMIT");
      let payload: unknown = {};
      try {
        payload = JSON.parse(String(row.payload_json ?? "{}"));
      } catch {
        payload = {};
      }
      return {
        id: String(row.id),
        provider: String(row.provider),
        eventType: String(row.event_type),
        externalEventId: String(row.external_event_id),
        payload,
        attempts,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async markWebhookEventProcessed(eventId: string): Promise<void> {
    await this.pool.query(
      `UPDATE webhook_events
       SET status = 'PROCESSED', processed_at = $1, error_message = ''
       WHERE id = $2`,
      [isoNow(), eventId]
    );
  }

  async markWebhookEventFailed(eventId: string, message: string, attempts: number): Promise<void> {
    const isTerminal = attempts >= 5;
    const nextAvailable = new Date(
      Date.now() + Math.min(60, Math.max(5, attempts * 5)) * 1000
    ).toISOString();
    await this.pool.query(
      `UPDATE webhook_events
       SET status = $1, available_at = $2, error_message = $3
       WHERE id = $4`,
      [isTerminal ? "FAILED" : "PENDING", nextAvailable, message, eventId]
    );
  }
}

export function createPostgresDatabase(databaseUrl: string): DatabaseAdapter {
  return new PostgresDatabase(databaseUrl);
}
