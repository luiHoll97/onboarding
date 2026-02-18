import type { Resolvers } from "../generated/graphql.js";
import { mapProtoPermissionToGql, mapProtoRoleToGql } from "./rbac.js";

export const AdminUser: Resolvers["AdminUser"] = {
  role: (parent) => mapProtoRoleToGql(parent.role),
  permissions: (parent) => parent.permissions.map((permission) => mapProtoPermissionToGql(permission)),
};
