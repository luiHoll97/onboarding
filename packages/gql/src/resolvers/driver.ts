import { DriverStatus as GqlDriverStatus, type Resolvers } from "../generated/graphql.js";
import { DriverStatus } from "@driver-onboarding/proto";

function statusFromProto(n: number): GqlDriverStatus {
  switch (n) {
    case DriverStatus.APPROVED:
      return GqlDriverStatus.Approved;
    case DriverStatus.REJECTED:
      return GqlDriverStatus.Rejected;
    default:
      return GqlDriverStatus.Pending;
  }
}

export const driver: Resolvers["Driver"] = {
  status: (parent) => statusFromProto(parent.status),
};
