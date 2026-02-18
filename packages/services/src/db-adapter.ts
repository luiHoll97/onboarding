import type {
  CreateAdminRequest,
  CreateAdminResponse,
  DeleteAdminRequest,
  DeleteAdminResponse,
  Driver,
  GetAdminRequest,
  GetAdminResponse,
  GetDriverStatsRequest,
  GetDriverStatsResponse,
  GetDriversByFiltersRequest,
  GetDriversByFiltersResponse,
  ListAdminsResponse,
  ListDriversRequest,
  ListDriversResponse,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  LogoutResponse,
  UpdateAdminAccessRequest,
  UpdateAdminAccessResponse,
  ValidateSessionRequest,
  ValidateSessionResponse,
} from "@driver-onboarding/proto";
import { createAppDatabase, type WebhookEvent } from "./db.js";
import { createPostgresDatabase } from "./db-postgres.js";

export interface DatabaseAdapter {
  getDriver(id: string): Promise<Driver | undefined>;
  listDrivers(request: ListDriversRequest): Promise<ListDriversResponse>;
  getDriversByFilters(
    request: GetDriversByFiltersRequest
  ): Promise<GetDriversByFiltersResponse>;
  batchGetDrivers(ids: string[]): Promise<Driver[]>;
  getDriverStats(request: GetDriverStatsRequest): Promise<GetDriverStatsResponse>;
  updateDriver(next: Driver, actor: string): Promise<Driver | undefined>;
  login(request: LoginRequest): Promise<LoginResponse | undefined>;
  validateSession(request: ValidateSessionRequest): Promise<ValidateSessionResponse>;
  logout(request: LogoutRequest): Promise<LogoutResponse>;
  listAdmins(): Promise<ListAdminsResponse>;
  getAdmin(request: GetAdminRequest): Promise<GetAdminResponse>;
  createAdmin(request: CreateAdminRequest): Promise<CreateAdminResponse>;
  updateAdminAccess(
    request: UpdateAdminAccessRequest
  ): Promise<UpdateAdminAccessResponse>;
  deleteAdmin(request: DeleteAdminRequest): Promise<DeleteAdminResponse>;
  findDriverByEmail(email: string): Promise<Driver | undefined>;
  enqueueWebhookEvent(input: {
    provider: string;
    eventType: string;
    externalEventId: string;
    payload: unknown;
  }): Promise<{ queued: boolean; eventId: string; duplicate: boolean }>;
  claimNextWebhookEvent(provider: string): Promise<WebhookEvent | undefined>;
  markWebhookEventProcessed(eventId: string): Promise<void>;
  markWebhookEventFailed(eventId: string, message: string, attempts: number): Promise<void>;
}

class SqliteDatabaseAdapter implements DatabaseAdapter {
  private readonly db = createAppDatabase();

  async getDriver(id: string): Promise<Driver | undefined> {
    return this.db.getDriver(id);
  }
  async listDrivers(request: ListDriversRequest): Promise<ListDriversResponse> {
    return this.db.listDrivers(request);
  }
  async getDriversByFilters(
    request: GetDriversByFiltersRequest
  ): Promise<GetDriversByFiltersResponse> {
    return this.db.getDriversByFilters(request);
  }
  async batchGetDrivers(ids: string[]): Promise<Driver[]> {
    return this.db.batchGetDrivers(ids);
  }
  async getDriverStats(request: GetDriverStatsRequest): Promise<GetDriverStatsResponse> {
    return this.db.getDriverStats(request);
  }
  async updateDriver(next: Driver, actor: string): Promise<Driver | undefined> {
    return this.db.updateDriver(next, actor);
  }
  async login(request: LoginRequest): Promise<LoginResponse | undefined> {
    return this.db.login(request);
  }
  async validateSession(request: ValidateSessionRequest): Promise<ValidateSessionResponse> {
    return this.db.validateSession(request);
  }
  async logout(request: LogoutRequest): Promise<LogoutResponse> {
    return this.db.logout(request);
  }
  async listAdmins(): Promise<ListAdminsResponse> {
    return this.db.listAdmins();
  }
  async getAdmin(request: GetAdminRequest): Promise<GetAdminResponse> {
    return this.db.getAdmin(request);
  }
  async createAdmin(request: CreateAdminRequest): Promise<CreateAdminResponse> {
    return this.db.createAdmin(request);
  }
  async updateAdminAccess(
    request: UpdateAdminAccessRequest
  ): Promise<UpdateAdminAccessResponse> {
    return this.db.updateAdminAccess(request);
  }
  async deleteAdmin(request: DeleteAdminRequest): Promise<DeleteAdminResponse> {
    return this.db.deleteAdmin(request);
  }
  async findDriverByEmail(email: string): Promise<Driver | undefined> {
    return this.db.findDriverByEmail(email);
  }
  async enqueueWebhookEvent(input: {
    provider: string;
    eventType: string;
    externalEventId: string;
    payload: unknown;
  }): Promise<{ queued: boolean; eventId: string; duplicate: boolean }> {
    return this.db.enqueueWebhookEvent(input);
  }
  async claimNextWebhookEvent(provider: string): Promise<WebhookEvent | undefined> {
    return this.db.claimNextWebhookEvent(provider);
  }
  async markWebhookEventProcessed(eventId: string): Promise<void> {
    this.db.markWebhookEventProcessed(eventId);
  }
  async markWebhookEventFailed(
    eventId: string,
    message: string,
    attempts: number
  ): Promise<void> {
    this.db.markWebhookEventFailed(eventId, message, attempts);
  }
}

export function createDatabaseAdapter(): DatabaseAdapter {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (databaseUrl) {
    return createPostgresDatabase(databaseUrl);
  }
  return new SqliteDatabaseAdapter();
}
