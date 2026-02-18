import { AdminPermission } from "@driver-onboarding/proto";
import type { Resolvers } from "../../generated/graphql.js";
import { requirePermission } from "../auth.js";

export const WebhooksQuery: NonNullable<Resolvers["Query"]>["webhooks"] = async (
  _parent,
  { provider, limit },
  ctx
) => {
  requirePermission(ctx, AdminPermission.SEND_FORMS);
  const response = await ctx.clients.formsService.listWebhookEvents({
    provider: provider ?? "",
    limit: limit ?? 50,
  });
  return response.events;
};
