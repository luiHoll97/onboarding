import type {
  AdminUser,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  LogoutResponse,
  ValidateSessionRequest,
  ValidateSessionResponse,
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

function parseAdminUser(value: unknown): AdminUser | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  return {
    id: parseString(objectField(value, "id"), ""),
    email: parseString(objectField(value, "email"), ""),
    name: parseString(objectField(value, "name"), ""),
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
}
