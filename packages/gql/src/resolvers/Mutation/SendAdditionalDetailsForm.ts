import { AdminPermission } from "@driver-onboarding/proto";
import type { Resolvers } from "../../generated/graphql.js";
import { requirePermission } from "../auth.js";

export const SendAdditionalDetailsFormMutation: NonNullable<
  Resolvers["Mutation"]
>["sendAdditionalDetailsForm"] = async (_parent, { driverId, mondayId }, ctx) => {
  requirePermission(ctx, AdminPermission.SEND_FORMS);
  const response = await ctx.clients.driverService.sendAdditionalDetailsForm({
    driverId,
    mondayId: mondayId ?? "",
  });
  return {
    ...response,
    provider: "typeform",
  };
};
