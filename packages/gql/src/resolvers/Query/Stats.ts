import { GraphQLError } from "graphql";
import { DriverStatus as GqlDriverStatus, type Resolvers } from "../../generated/graphql.js";
import { AdminPermission, DriverStatus } from "@driver-onboarding/proto";
import { requirePermission } from "../auth.js";

export const StatsQuery: NonNullable<Resolvers["Query"]>["stats"] = async (
  _parent,
  { filters },
  ctx
) => {
  requirePermission(ctx, AdminPermission.VIEW_STATS);
  let statusFilter: DriverStatus | undefined;
  if (filters?.status != null) {
    statusFilter =
      filters.status === GqlDriverStatus.Pending
        ? DriverStatus.PENDING
        : filters.status === GqlDriverStatus.Approved
          ? DriverStatus.APPROVED
          : DriverStatus.REJECTED;
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
    byStatus: [
      { status: GqlDriverStatus.Pending, count: byStatus.PENDING ?? 0 },
      { status: GqlDriverStatus.Approved, count: byStatus.APPROVED ?? 0 },
      { status: GqlDriverStatus.Rejected, count: byStatus.REJECTED ?? 0 },
    ],
    total: data.total ?? 0,
  };
};
