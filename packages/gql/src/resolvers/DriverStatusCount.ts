import { DriverStatus, type Resolvers } from "../generated/graphql.js";

function statusLabel(value: DriverStatus): DriverStatus {
  if (value === DriverStatus.Approved) return DriverStatus.Approved;
  if (value === DriverStatus.Rejected) return DriverStatus.Rejected;
  return DriverStatus.Pending;
}

export const DriverStatusCount: Resolvers["DriverStatusCount"] = {
  status: (parent) => statusLabel(parent.status),
  count: (parent) => parent.count,
};
