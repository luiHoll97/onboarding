import { AdminPermission } from "@driver-onboarding/proto";
import type { Resolvers } from "../../generated/graphql.js";
import { requirePermission } from "../auth.js";
import { mapGqlPermissionToProto, mapGqlRoleToProto } from "../rbac.js";

export const UpdateAdminAccessMutation: NonNullable<
  Resolvers["Mutation"]
>["updateAdminAccess"] = async (_parent, { input }, ctx) => {
  requirePermission(ctx, AdminPermission.MANAGE_ADMINS);
  const response = await ctx.clients.authService.updateAdminAccess({
    id: input.id,
    role: mapGqlRoleToProto(input.role),
    permissions: (input.permissions ?? []).map((permission) =>
      mapGqlPermissionToProto(permission)
    ),
  });
  return response.admin ?? null;
};
