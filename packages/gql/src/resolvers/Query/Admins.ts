import { AdminPermission } from "@driver-onboarding/proto";
import type { Resolvers } from "../../generated/graphql.js";
import { requirePermission } from "../auth.js";

export const AdminsQuery: NonNullable<Resolvers["Query"]>["admins"] = async (
  _parent,
  _args,
  ctx
) => {
  requirePermission(ctx, AdminPermission.MANAGE_ADMINS);
  const response = await ctx.clients.authService.listAdmins();
  return response.admins;
};
