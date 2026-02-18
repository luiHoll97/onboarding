import type { Resolvers } from "../generated/graphql.js";

export const DriverStats: Resolvers["DriverStats"] = {
  byStatus: (parent) => parent.byStatus,
  total: (parent) => parent.total,
};
