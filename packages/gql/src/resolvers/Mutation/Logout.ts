import type { Resolvers } from "../../generated/graphql.js";
import { requireAdmin } from "../auth.js";

export const LogoutMutation: NonNullable<Resolvers["Mutation"]>["logout"] = async (
  _parent,
  _args,
  ctx
) => {
  requireAdmin(ctx);
  if (!ctx.auth.token) {
    return false;
  }
  const out = await ctx.clients.authService.logout({ token: ctx.auth.token });
  return out.success;
};
