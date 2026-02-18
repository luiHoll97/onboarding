import { AdminPermission, type DriverStatus } from "@driver-onboarding/proto";
import type { Resolvers } from "../../generated/graphql.js";
import { requirePermission } from "../auth.js";
import { driverStatusToProto } from "../driver-status.js";

export const DriversByFiltersQuery: NonNullable<
  Resolvers["Query"]
>["driversByFilters"] = async (_parent, { filters, pageSize, pageToken }, ctx) => {
  requirePermission(ctx, AdminPermission.VIEW_DRIVERS);
  let statusFilter: DriverStatus | undefined;
  if (filters?.status != null) {
    statusFilter = driverStatusToProto(filters.status);
  }
  const data = await ctx.clients.driverService.getDriversByFilters({
    statusFilter,
    search: filters?.search ?? "",
    pageSize: pageSize ?? 20,
    pageToken: pageToken ?? "",
  });
  return {
    drivers: data.drivers,
    nextPageToken: data.nextPageToken ?? null,
  };
};
