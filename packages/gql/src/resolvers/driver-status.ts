import { DriverStatus as ProtoDriverStatus } from "@driver-onboarding/proto";
import { DriverStatus as GqlDriverStatus } from "../generated/graphql.js";

export const allDriverStatuses: GqlDriverStatus[] = [
  GqlDriverStatus.AdditionalDetailsSent,
  GqlDriverStatus.AdditionalDetailsCompleted,
  GqlDriverStatus.InternalDetailsSent,
  GqlDriverStatus.InternalDetailsCompleted,
  GqlDriverStatus.AwaitingInduction,
  GqlDriverStatus.Withdrawn,
  GqlDriverStatus.Rejected,
];

export function driverStatusFromProto(value: number): GqlDriverStatus {
  switch (value) {
    case ProtoDriverStatus.ADDITIONAL_DETAILS_COMPLETED:
      return GqlDriverStatus.AdditionalDetailsCompleted;
    case ProtoDriverStatus.INTERNAL_DETAILS_SENT:
      return GqlDriverStatus.InternalDetailsSent;
    case ProtoDriverStatus.INTERNAL_DETAILS_COMPLETED:
      return GqlDriverStatus.InternalDetailsCompleted;
    case ProtoDriverStatus.AWAITING_INDUCTION:
      return GqlDriverStatus.AwaitingInduction;
    case ProtoDriverStatus.WITHDRAWN:
      return GqlDriverStatus.Withdrawn;
    case ProtoDriverStatus.REJECTED:
      return GqlDriverStatus.Rejected;
    default:
      return GqlDriverStatus.AdditionalDetailsSent;
  }
}

export function driverStatusToProto(value: GqlDriverStatus): ProtoDriverStatus {
  switch (value) {
    case GqlDriverStatus.AdditionalDetailsCompleted:
      return ProtoDriverStatus.ADDITIONAL_DETAILS_COMPLETED;
    case GqlDriverStatus.InternalDetailsSent:
      return ProtoDriverStatus.INTERNAL_DETAILS_SENT;
    case GqlDriverStatus.InternalDetailsCompleted:
      return ProtoDriverStatus.INTERNAL_DETAILS_COMPLETED;
    case GqlDriverStatus.AwaitingInduction:
      return ProtoDriverStatus.AWAITING_INDUCTION;
    case GqlDriverStatus.Withdrawn:
      return ProtoDriverStatus.WITHDRAWN;
    case GqlDriverStatus.Rejected:
      return ProtoDriverStatus.REJECTED;
    default:
      return ProtoDriverStatus.ADDITIONAL_DETAILS_SENT;
  }
}
