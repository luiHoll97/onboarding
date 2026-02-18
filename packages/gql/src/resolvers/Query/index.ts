import type { Resolvers } from "../../generated/graphql.js";
import { MeQuery } from "./Me.js";
import { DriverQuery } from "./Driver.js";
import { DriversQuery } from "./Drivers.js";
import { DriversByFiltersQuery } from "./DriversByFilters.js";
import { StatsQuery } from "./Stats.js";

export const Query: Resolvers["Query"] = {
  me: MeQuery,
  driver: DriverQuery,
  drivers: DriversQuery,
  driversByFilters: DriversByFiltersQuery,
  stats: StatsQuery,
};
