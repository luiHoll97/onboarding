import { GraphQLError } from "graphql";
import type { Resolvers } from "../../generated/graphql.js";
import { requireAdmin } from "../auth.js";

export const DriverQuery: NonNullable<Resolvers["Query"]>["driver"] = async (
  _parent,
  { id },
  ctx
) => {
  requireAdmin(ctx);
  const { driver } = await ctx.clients.driverService.getDriver({ id });
  if (!driver) {
    throw new GraphQLError("Driver not found");
  }
  return driver;
};
