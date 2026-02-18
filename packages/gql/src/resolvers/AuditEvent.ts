import { AuditAction } from "@driver-onboarding/proto";
import { AuditAction as GqlAuditAction, type Resolvers } from "../generated/graphql.js";

function actionFromProto(action: AuditAction): GqlAuditAction {
  if (action === AuditAction.CREATED) return GqlAuditAction.Created;
  if (action === AuditAction.STATUS_CHANGED) return GqlAuditAction.StatusChanged;
  return GqlAuditAction.Updated;
}

export const AuditEvent: Resolvers["AuditEvent"] = {
  id: (parent) => parent.id,
  actor: (parent) => parent.actor,
  action: (parent) => actionFromProto(parent.action),
  timestamp: (parent) => parent.timestamp,
  field: (parent) => parent.field,
  oldValue: (parent) => parent.oldValue,
  newValue: (parent) => parent.newValue,
  note: (parent) => parent.note,
};
