import { GraphQLError } from "graphql";
import type { Resolvers } from "../../generated/graphql.js";
import { AdminPermission, type DriverStatus } from "@driver-onboarding/proto";
import { requirePermission } from "../auth.js";
import {
  allDriverStatuses,
  driverStatusToProto,
} from "../driver-status.js";

export const StatsQuery: NonNullable<Resolvers["Query"]>["stats"] = async (
  _parent,
  { filters },
  ctx
) => {
  requirePermission(ctx, AdminPermission.VIEW_STATS);
  let statusFilter: DriverStatus | undefined;
  if (filters?.status != null) {
    statusFilter = driverStatusToProto(filters.status);
  }

  const data = await ctx.clients.driverService.getDriverStats({
    statusFilter,
    search: filters?.search ?? "",
  });
  const byStatus = data.byStatus;
  if (!byStatus) {
    throw new GraphQLError("No status data found");
  }
  return {
    byStatus: allDriverStatuses.map((status) => ({
      status,
      count: byStatus[status] ?? 0,
    })),
    total: data.total ?? 0,
  };
};
