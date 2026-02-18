import { AdminPermission } from "@driver-onboarding/proto";
import type { Resolvers } from "../../generated/graphql.js";
import { requirePermission } from "../auth.js";

export const DriversQuery: NonNullable<Resolvers["Query"]>["drivers"] = async (
  _parent,
  { pageSize, pageToken },
  ctx
) => {
  requirePermission(ctx, AdminPermission.VIEW_DRIVERS);
  const data = await ctx.clients.driverService.listDrivers({
    pageSize: pageSize ?? 10,
    pageToken: pageToken ?? "",
  });
  return {
    drivers: data.drivers,
    nextPageToken: data.nextPageToken ?? null,
  };
};
