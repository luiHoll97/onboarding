/**
 * Stub: run `yarn codegen:proto` to generate real code with buf.
 * This file is overwritten by buf generate.
 */
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: AdminPermission[];
  createdAt: string;
}

export enum AdminRole {
  UNSPECIFIED = 0,
  SUPER_ADMIN = 1,
  OPERATIONS = 2,
  RECRUITER = 3,
  VIEWER = 4,
}

export enum AdminPermission {
  UNSPECIFIED = 0,
  MANAGE_ADMINS = 1,
  VIEW_DRIVERS = 2,
  EDIT_DRIVERS = 3,
  VIEW_STATS = 4,
  SEND_FORMS = 5,
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user?: AdminUser;
}

export interface ValidateSessionRequest {
  token: string;
}

export interface ValidateSessionResponse {
  valid: boolean;
  expiresAt: string;
  user?: AdminUser;
}

export interface LogoutRequest {
  token: string;
}

export interface LogoutResponse {
  success: boolean;
}

export interface ListAdminsRequest {}

export interface ListAdminsResponse {
  admins: AdminUser[];
}

export interface GetAdminRequest {
  id: string;
}

export interface GetAdminResponse {
  admin?: AdminUser;
}

export interface CreateAdminRequest {
  email: string;
  name: string;
  password: string;
  role: AdminRole;
  permissions: AdminPermission[];
}

export interface CreateAdminResponse {
  admin?: AdminUser;
}

export interface UpdateAdminAccessRequest {
  id: string;
  role: AdminRole;
  permissions: AdminPermission[];
}

export interface UpdateAdminAccessResponse {
  admin?: AdminUser;
}

export interface DeleteAdminRequest {
  id: string;
}

export interface DeleteAdminResponse {
  success: boolean;
}
