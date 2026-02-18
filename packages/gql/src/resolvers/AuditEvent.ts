import { AuditAction } from "@driver-onboarding/proto";
import { AuditAction as GqlAuditAction, type Resolvers } from "../generated/graphql.js";

function actionFromProto(action: AuditAction): GqlAuditAction {
  if (action === AuditAction.CREATED) return GqlAuditAction.Created;
  if (action === AuditAction.STATUS_CHANGED) return GqlAuditAction.StatusChanged;
  return GqlAuditAction.Updated;
}

export const AuditEvent: Resolvers["AuditEvent"] = {
  action: (parent) => actionFromProto(parent.action),
};
