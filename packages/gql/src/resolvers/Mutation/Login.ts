import { GraphQLError } from "graphql";
import type { Resolvers } from "../../generated/graphql.js";

export const LoginMutation: NonNullable<Resolvers["Mutation"]>["login"] = async (
  _parent,
  { email, password },
  ctx
) => {
  const session = await ctx.clients.authService.login({ email, password });
  if (!session || !session.user || !session.token) {
    throw new GraphQLError("Error Logging In")
  }

  return {
    token: session.token,
    expiresAt: session.expiresAt,
    user: session.user,
  };
};
