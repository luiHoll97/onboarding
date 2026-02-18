import type { AdminUser } from "@driver-onboarding/proto";
import type { createClients } from "./clients/index.js";

export interface AuthContext {
  token: string;
  user: AdminUser | undefined;
  isAuthenticated: boolean;
}

export interface Context {
  servicesBaseUrl: string;
  clients: ReturnType<typeof createClients>;
  auth: AuthContext;
}
