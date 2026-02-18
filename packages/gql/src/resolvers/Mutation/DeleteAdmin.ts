import { AdminPermission } from "@driver-onboarding/proto";
import type { Resolvers } from "../../generated/graphql.js";
import { requirePermission } from "../auth.js";

export const DeleteAdminMutation: NonNullable<
  Resolvers["Mutation"]
>["deleteAdmin"] = async (_parent, { id }, ctx) => {
  const actor = requirePermission(ctx, AdminPermission.MANAGE_ADMINS);
  if (actor.id === id) {
    throw new Error("You cannot delete your own admin account");
  }
  const response = await ctx.clients.authService.deleteAdmin({ id });
  return response.success;
};
