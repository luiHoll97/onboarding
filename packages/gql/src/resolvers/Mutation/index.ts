import type { Resolvers } from "../../generated/graphql.js";
import { LoginMutation } from "./Login.js";
import { LogoutMutation } from "./Logout.js";
import { UpdateDriverMutation } from "./UpdateDriver.js";

export const Mutation: Resolvers["Mutation"] = {
  login: LoginMutation,
  logout: LogoutMutation,
  updateDriver: UpdateDriverMutation,
};
