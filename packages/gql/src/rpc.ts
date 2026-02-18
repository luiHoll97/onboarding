export const driverRpcMethods = {
  getDriver: "driver.v1.DriverService.GetDriver",
  listDrivers: "driver.v1.DriverService.ListDrivers",
  getDriversByFilters: "driver.v1.DriverService.GetDriversByFilters",
  batchGetDrivers: "driver.v1.DriverService.BatchGetDrivers",
  getDriverStats: "driver.v1.DriverService.GetDriverStats",
  updateDriver: "driver.v1.DriverService.UpdateDriver",
  login: "svc.core.auth.AuthService.Login",
  validateSession: "svc.core.auth.AuthService.ValidateSession",
  logout: "svc.core.auth.AuthService.Logout",
};

export async function callServicesRpc(
  baseUrl: string,
  method: string,
  params: unknown
): Promise<unknown> {
  const res = await fetch(`${baseUrl}/rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, params }),
  });
  const data = await res.json();
  if (!res.ok) {
    const message =
      data?.error?.message ?? `RPC call failed for method "${method}"`;
    throw new Error(message);
  }
  return data?.result;
}
