import type { Resolvers } from "../../generated/graphql.js";
import { MeQuery } from "./Me.js";
import { AdminsQuery } from "./Admins.js";
import { AdminQuery } from "./Admin.js";
import { WebhooksQuery } from "./Webhooks.js";
import { DriverQuery } from "./Driver.js";
import { DriversQuery } from "./Drivers.js";
import { DriversByFiltersQuery } from "./DriversByFilters.js";
import { StatsQuery } from "./Stats.js";

export const Query: Resolvers["Query"] = {
  me: MeQuery,
  webhooks: WebhooksQuery,
  admins: AdminsQuery,
  admin: AdminQuery,
  driver: DriverQuery,
  drivers: DriversQuery,
  driversByFilters: DriversByFiltersQuery,
  stats: StatsQuery,
};
