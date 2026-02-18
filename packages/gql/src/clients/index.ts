import { AuthServiceClient } from "./authService.js";
import { DriverServiceClient } from "./driverService.js";
import { FormsServiceClient } from "./formsService.js";

export function createClients(servicesBaseUrl: string) {
  return {
    driverService: new DriverServiceClient(servicesBaseUrl),
    authService: new AuthServiceClient(servicesBaseUrl),
    formsService: new FormsServiceClient(servicesBaseUrl),
  };
}
