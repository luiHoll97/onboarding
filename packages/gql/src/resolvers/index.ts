import type { Resolvers } from "../generated/graphql.js";
import { Query } from "./Query/index.js";
import { Mutation } from "./Mutation/index.js";
import { driver } from "./driver.js";
import { DriversConnection } from "./DriversConnection.js";
import { DriverStats } from "./DriverStats.js";
import { DriverStatusCount } from "./DriverStatusCount.js";
import { AuditEvent } from "./AuditEvent.js";

export function createResolvers(): Resolvers {
  return {
    Query,
    Mutation,
    Driver: driver,
    DriversConnection,
    DriverStats,
    DriverStatusCount,
    AuditEvent,
  };
}
