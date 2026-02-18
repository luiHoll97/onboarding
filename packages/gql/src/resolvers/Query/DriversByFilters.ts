import { DriverStatus } from "@driver-onboarding/proto";
import { DriverStatus as GqlDriverStatus, type Resolvers } from "../../generated/graphql.js";
import { requireAdmin } from "../auth.js";

export const DriversByFiltersQuery: NonNullable<
  Resolvers["Query"]
>["driversByFilters"] = async (_parent, { filters, pageSize, pageToken }, ctx) => {
  requireAdmin(ctx);
  let statusFilter: DriverStatus | undefined;
  if (filters?.status != null) {
    statusFilter =
      filters.status === GqlDriverStatus.Pending
        ? DriverStatus.PENDING
        : filters.status === GqlDriverStatus.Approved
          ? DriverStatus.APPROVED
          : DriverStatus.REJECTED;
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
