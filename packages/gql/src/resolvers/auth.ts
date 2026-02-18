import {
  AdminPermission,
  AdminRole,
  type AdminUser,
} from "@driver-onboarding/proto";
import type { Context } from "../context.js";

export function requireAdmin(context: Context): AdminUser {
  if (!context.auth.isAuthenticated || !context.auth.user) {
    throw new Error("Unauthorized");
  }
  return context.auth.user;
}

export function hasPermission(user: AdminUser, permission: AdminPermission): boolean {
  if (user.role === AdminRole.SUPER_ADMIN) {
    return true;
  }
  return user.permissions.includes(permission);
}

export function requirePermission(context: Context, permission: AdminPermission): AdminUser {
  const user = requireAdmin(context);
  if (!hasPermission(user, permission)) {
    throw new Error("Forbidden");
  }
  return user;
}
