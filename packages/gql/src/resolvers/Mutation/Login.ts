import type { Resolvers } from "../../generated/graphql.js";

export const LoginMutation: NonNullable<Resolvers["Mutation"]>["login"] = async (
  _parent,
  { email, password },
  ctx
) => {
  const session = await ctx.clients.authService.login({ email, password });
  if (!session || !session.user || !session.token) {
    return null;
  }
  return {
    token: session.token,
    expiresAt: session.expiresAt,
    user: session.user,
  };
};
