import { AdminPermission } from "@driver-onboarding/proto";
import type { Resolvers } from "../../generated/graphql.js";
import { requirePermission } from "../auth.js";

export const AdminQuery: NonNullable<Resolvers["Query"]>["admin"] = async (
  _parent,
  { id },
  ctx
) => {
  requirePermission(ctx, AdminPermission.MANAGE_ADMINS);
  const response = await ctx.clients.authService.getAdmin({ id });
  return response.admin ?? null;
};
