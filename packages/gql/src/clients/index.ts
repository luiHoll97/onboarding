import { AuthServiceClient } from "./authService.js";
import { DriverServiceClient } from "./driverService.js";

export function createClients(servicesBaseUrl: string) {
  return {
    driverService: new DriverServiceClient(servicesBaseUrl),
    authService: new AuthServiceClient(servicesBaseUrl),
  };
}
