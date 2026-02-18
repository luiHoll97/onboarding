import { AdminPermission } from "@driver-onboarding/proto";
import type { Resolvers } from "../../generated/graphql.js";
import { requirePermission } from "../auth.js";
import { mapGqlPermissionToProto, mapGqlRoleToProto } from "../rbac.js";

export const CreateAdminMutation: NonNullable<
  Resolvers["Mutation"]
>["createAdmin"] = async (_parent, { input }, ctx) => {
  requirePermission(ctx, AdminPermission.MANAGE_ADMINS);
  const response = await ctx.clients.authService.createAdmin({
    email: input.email,
    name: input.name,
    password: input.password,
    role: mapGqlRoleToProto(input.role),
    permissions: (input.permissions ?? []).map((permission) =>
      mapGqlPermissionToProto(permission)
    ),
  });
  return response.admin ?? null;
};
