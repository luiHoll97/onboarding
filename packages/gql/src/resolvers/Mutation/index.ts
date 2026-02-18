import type { Resolvers } from "../../generated/graphql.js";
import { LoginMutation } from "./Login.js";
import { LogoutMutation } from "./Logout.js";
import { CreateAdminMutation } from "./CreateAdmin.js";
import { UpdateAdminAccessMutation } from "./UpdateAdminAccess.js";
import { DeleteAdminMutation } from "./DeleteAdmin.js";
import { SendAdditionalDetailsFormMutation } from "./SendAdditionalDetailsForm.js";
import { UpdateDriverMutation } from "./UpdateDriver.js";
import { CreateDriverMutation } from "./CreateDriver.js";

export const Mutation: Resolvers["Mutation"] = {
  login: LoginMutation,
  logout: LogoutMutation,
  createAdmin: CreateAdminMutation,
  updateAdminAccess: UpdateAdminAccessMutation,
  deleteAdmin: DeleteAdminMutation,
  createDriver: CreateDriverMutation,
  sendAdditionalDetailsForm: SendAdditionalDetailsFormMutation,
  updateDriver: UpdateDriverMutation,
};
