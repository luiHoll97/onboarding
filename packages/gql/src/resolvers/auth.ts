import type { AdminUser } from "@driver-onboarding/proto";
import type { Context } from "../context.js";

export function requireAdmin(context: Context): AdminUser {
  if (!context.auth.isAuthenticated || !context.auth.user) {
    throw new Error("Unauthorized");
  }
  return context.auth.user;
}
