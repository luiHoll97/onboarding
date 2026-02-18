import {
  AdminPermission,
  AdminRole,
} from "@driver-onboarding/proto";
import {
  AdminPermission as GqlAdminPermission,
  AdminRole as GqlAdminRole,
} from "../generated/graphql.js";

export function mapGqlRoleToProto(role: GqlAdminRole): AdminRole {
  if (role === GqlAdminRole.SuperAdmin) return AdminRole.SUPER_ADMIN;
  if (role === GqlAdminRole.Operations) return AdminRole.OPERATIONS;
  if (role === GqlAdminRole.Recruiter) return AdminRole.RECRUITER;
  return AdminRole.VIEWER;
}

export function mapProtoRoleToGql(role: AdminRole): GqlAdminRole {
  if (role === AdminRole.SUPER_ADMIN) return GqlAdminRole.SuperAdmin;
  if (role === AdminRole.OPERATIONS) return GqlAdminRole.Operations;
  if (role === AdminRole.RECRUITER) return GqlAdminRole.Recruiter;
  return GqlAdminRole.Viewer;
}

export function mapGqlPermissionToProto(permission: GqlAdminPermission): AdminPermission {
  if (permission === GqlAdminPermission.ManageAdmins) {
    return AdminPermission.MANAGE_ADMINS;
  }
  if (permission === GqlAdminPermission.ViewDrivers) {
    return AdminPermission.VIEW_DRIVERS;
  }
  if (permission === GqlAdminPermission.EditDrivers) {
    return AdminPermission.EDIT_DRIVERS;
  }
  if (permission === GqlAdminPermission.ViewStats) {
    return AdminPermission.VIEW_STATS;
  }
  return AdminPermission.SEND_FORMS;
}

export function mapProtoPermissionToGql(
  permission: AdminPermission
): GqlAdminPermission {
  if (permission === AdminPermission.MANAGE_ADMINS) {
    return GqlAdminPermission.ManageAdmins;
  }
  if (permission === AdminPermission.VIEW_DRIVERS) {
    return GqlAdminPermission.ViewDrivers;
  }
  if (permission === AdminPermission.EDIT_DRIVERS) {
    return GqlAdminPermission.EditDrivers;
  }
  if (permission === AdminPermission.VIEW_STATS) {
    return GqlAdminPermission.ViewStats;
  }
  return GqlAdminPermission.SendForms;
}
