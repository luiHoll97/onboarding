import type { Resolvers } from "../generated/graphql.js";
import { driverStatusFromProto } from "./driver-status.js";

export const driver: Resolvers["Driver"] = {
  status: (parent) => driverStatusFromProto(parent.status),
};
