import { DriverStatus, type Resolvers } from "../generated/graphql.js";

function statusLabel(value: DriverStatus): DriverStatus {
  return value;
}

export const DriverStatusCount: Resolvers["DriverStatusCount"] = {
  status: (parent) => statusLabel(parent.status),
  count: (parent) => parent.count,
};
