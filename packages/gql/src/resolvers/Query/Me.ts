import type { Resolvers } from "../../generated/graphql.js";

export const MeQuery: NonNullable<Resolvers["Query"]>["me"] = async (
  _parent,
  _args,
  ctx
) => {
  return ctx.auth.user ?? null;
};
