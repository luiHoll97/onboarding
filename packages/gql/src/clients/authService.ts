import type {
  AdminUser,
  AdminPermission,
  AdminRole,
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
  ValidateSessionRequest,
  ValidateSessionResponse,
  UpdateAdminAccessRequest,
  UpdateAdminAccessResponse,
} from "@driver-onboarding/proto";
import { callServicesRpc, driverRpcMethods } from "../rpc.js";

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

function parseBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseAdminRole(value: unknown): AdminRole {
  if (value === 1 || value === "SUPER_ADMIN") return 1;
  if (value === 2 || value === "OPERATIONS") return 2;
  if (value === 3 || value === "RECRUITER") return 3;
  if (value === 4 || value === "VIEWER") return 4;
  return 0;
}

function parseAdminPermission(value: unknown): AdminPermission | undefined {
  if (value === 1 || value === "MANAGE_ADMINS") return 1;
  if (value === 2 || value === "VIEW_DRIVERS") return 2;
  if (value === 3 || value === "EDIT_DRIVERS") return 3;
  if (value === 4 || value === "VIEW_STATS") return 4;
  if (value === 5 || value === "SEND_FORMS") return 5;
  return undefined;
}

function parseAdminPermissions(value: unknown): AdminPermission[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: AdminPermission[] = [];
  for (const item of value) {
    const parsed = parseAdminPermission(item);
    if (parsed !== undefined && !out.includes(parsed)) {
      out.push(parsed);
    }
  }
  return out;
}

function parseAdminUser(value: unknown): AdminUser | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  return {
    id: parseString(objectField(value, "id"), ""),
    email: parseString(objectField(value, "email"), ""),
    name: parseString(objectField(value, "name"), ""),
    role: parseAdminRole(objectField(value, "role")),
    permissions: parseAdminPermissions(objectField(value, "permissions")),
    createdAt: parseString(objectField(value, "createdAt"), ""),
  };
}

function parseLoginResponse(value: unknown): LoginResponse | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  return {
    token: parseString(objectField(value, "token"), ""),
    expiresAt: parseString(objectField(value, "expiresAt"), ""),
    user: parseAdminUser(objectField(value, "user")),
  };
}

function parseValidateResponse(value: unknown): ValidateSessionResponse {
  if (typeof value !== "object" || value === null) {
    return { valid: false, expiresAt: "", user: undefined };
  }
  return {
    valid: parseBoolean(objectField(value, "valid"), false),
    expiresAt: parseString(objectField(value, "expiresAt"), ""),
    user: parseAdminUser(objectField(value, "user")),
  };
}

function parseLogoutResponse(value: unknown): LogoutResponse {
  if (typeof value !== "object" || value === null) {
    return { success: false };
  }
  return { success: parseBoolean(objectField(value, "success"), false) };
}

function parseListAdminsResponse(value: unknown): ListAdminsResponse {
  if (typeof value !== "object" || value === null) {
    return { admins: [] };
  }
  const rawAdmins = objectField(value, "admins");
  if (!Array.isArray(rawAdmins)) {
    return { admins: [] };
  }
  const admins: AdminUser[] = [];
  for (const entry of rawAdmins) {
    const admin = parseAdminUser(entry);
    if (admin) {
      admins.push(admin);
    }
  }
  return { admins };
}

function parseGetAdminResponse(value: unknown): GetAdminResponse {
  if (typeof value !== "object" || value === null) {
    return { admin: undefined };
  }
  return { admin: parseAdminUser(objectField(value, "admin")) };
}

function parseCreateAdminResponse(value: unknown): CreateAdminResponse {
  if (typeof value !== "object" || value === null) {
    return { admin: undefined };
  }
  return { admin: parseAdminUser(objectField(value, "admin")) };
}

function parseUpdateAdminAccessResponse(value: unknown): UpdateAdminAccessResponse {
  if (typeof value !== "object" || value === null) {
    return { admin: undefined };
  }
  return { admin: parseAdminUser(objectField(value, "admin")) };
}

function parseDeleteAdminResponse(value: unknown): DeleteAdminResponse {
  if (typeof value !== "object" || value === null) {
    return { success: false };
  }
  return { success: parseBoolean(objectField(value, "success"), false) };
}

export class AuthServiceClient {
  constructor(private readonly baseUrl: string) {}

  async login(params: LoginRequest): Promise<LoginResponse | undefined> {
    const result = await callServicesRpc(this.baseUrl, driverRpcMethods.login, params);
    return parseLoginResponse(result);
  }

  async validateSession(
    params: ValidateSessionRequest
  ): Promise<ValidateSessionResponse> {
    const result = await callServicesRpc(
      this.baseUrl,
      driverRpcMethods.validateSession,
      params
    );
    return parseValidateResponse(result);
  }

  async logout(params: LogoutRequest): Promise<LogoutResponse> {
    const result = await callServicesRpc(this.baseUrl, driverRpcMethods.logout, params);
    return parseLogoutResponse(result);
  }

  async listAdmins(): Promise<ListAdminsResponse> {
    const result = await callServicesRpc(this.baseUrl, driverRpcMethods.listAdmins, {});
    return parseListAdminsResponse(result);
  }

  async getAdmin(params: GetAdminRequest): Promise<GetAdminResponse> {
    const result = await callServicesRpc(this.baseUrl, driverRpcMethods.getAdmin, params);
    return parseGetAdminResponse(result);
  }

  async createAdmin(params: CreateAdminRequest): Promise<CreateAdminResponse> {
    const result = await callServicesRpc(this.baseUrl, driverRpcMethods.createAdmin, params);
    return parseCreateAdminResponse(result);
  }

  async updateAdminAccess(
    params: UpdateAdminAccessRequest
  ): Promise<UpdateAdminAccessResponse> {
    const result = await callServicesRpc(
      this.baseUrl,
      driverRpcMethods.updateAdminAccess,
      params
    );
    return parseUpdateAdminAccessResponse(result);
  }

  async deleteAdmin(params: DeleteAdminRequest): Promise<DeleteAdminResponse> {
    const result = await callServicesRpc(this.baseUrl, driverRpcMethods.deleteAdmin, params);
    return parseDeleteAdminResponse(result);
  }
}
