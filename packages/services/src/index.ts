import express from "express";
import cors from "cors";
import {
  DriverStatus,
  type BatchGetDriversRequest,
  type GetDriversByFiltersRequest,
  type GetDriverRequest,
  type GetDriverStatsRequest,
  type ListDriversRequest,
  type UpdateDriverRequest,
} from "@driver-onboarding/proto";
import type {
  LoginRequest,
  LogoutRequest,
  ValidateSessionRequest,
} from "@driver-onboarding/proto";
import { createAppDatabase } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

const db = createAppDatabase();

function objectField(source: unknown, key: string): unknown {
  if (typeof source !== "object" || source === null) {
    return undefined;
  }
  if (!(key in source)) {
    return undefined;
  }
  return Reflect.get(source, key);
}

function parseString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function parseInteger(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return fallback;
}

function parseDriverStatus(value: unknown): DriverStatus | undefined {
  if (value === DriverStatus.UNSPECIFIED) return DriverStatus.UNSPECIFIED;
  if (value === DriverStatus.PENDING) return DriverStatus.PENDING;
  if (value === DriverStatus.APPROVED) return DriverStatus.APPROVED;
  if (value === DriverStatus.REJECTED) return DriverStatus.REJECTED;
  return undefined;
}

function parseGetDriverRequest(value: unknown): GetDriverRequest {
  return { id: parseString(objectField(value, "id"), "") };
}

function parseListDriversRequest(value: unknown): ListDriversRequest {
  return {
    pageSize: parseInteger(objectField(value, "pageSize"), 10),
    pageToken: parseString(objectField(value, "pageToken"), ""),
  };
}

function parseGetDriversByFiltersRequest(value: unknown): GetDriversByFiltersRequest {
  return {
    statusFilter: parseDriverStatus(objectField(value, "statusFilter")),
    search: parseString(objectField(value, "search"), ""),
    pageSize: parseInteger(objectField(value, "pageSize"), 20),
    pageToken: parseString(objectField(value, "pageToken"), ""),
  };
}

function parseBatchGetDriversRequest(value: unknown): BatchGetDriversRequest {
  const raw = objectField(value, "ids");
  if (!Array.isArray(raw)) {
    return { ids: [] };
  }
  const ids = raw.filter((item): item is string => typeof item === "string");
  return { ids };
}

function parseGetDriverStatsRequest(value: unknown): GetDriverStatsRequest {
  return {
    statusFilter: parseDriverStatus(objectField(value, "statusFilter")),
    search: parseString(objectField(value, "search"), ""),
  };
}

function parseUpdateDriverRequest(value: unknown): UpdateDriverRequest {
  const actor = parseString(objectField(value, "actor"), "system");
  const rawDriver = objectField(value, "driver");
  if (!rawDriver) {
    return { actor, driver: undefined };
  }

  const id = parseString(objectField(rawDriver, "id"), "");
  const current = db.getDriver(id);
  if (!current) {
    return { actor, driver: undefined };
  }

  const idCheck = objectField(rawDriver, "idCheckCompleted");
  return {
    actor,
    driver: {
      ...current,
      id,
      name: parseString(objectField(rawDriver, "name"), current.name),
      firstName: parseString(objectField(rawDriver, "firstName"), current.firstName),
      lastName: parseString(objectField(rawDriver, "lastName"), current.lastName),
      email: parseString(objectField(rawDriver, "email"), current.email),
      phone: parseString(objectField(rawDriver, "phone"), current.phone ?? ""),
      status: parseDriverStatus(objectField(rawDriver, "status")) ?? current.status,
      appliedAt: parseString(objectField(rawDriver, "appliedAt"), current.appliedAt ?? ""),
      dateOfBirth: parseString(objectField(rawDriver, "dateOfBirth"), current.dateOfBirth),
      nationalInsuranceNumber: parseString(
        objectField(rawDriver, "nationalInsuranceNumber"),
        current.nationalInsuranceNumber
      ),
      rightToWorkCheckCode: parseString(
        objectField(rawDriver, "rightToWorkCheckCode"),
        current.rightToWorkCheckCode
      ),
      inductionDate: parseString(objectField(rawDriver, "inductionDate"), current.inductionDate),
      interviewDate: parseString(objectField(rawDriver, "interviewDate"), current.interviewDate),
      idDocumentType: parseString(objectField(rawDriver, "idDocumentType"), current.idDocumentType),
      idDocumentNumber: parseString(
        objectField(rawDriver, "idDocumentNumber"),
        current.idDocumentNumber
      ),
      idCheckCompleted: typeof idCheck === "boolean" ? idCheck : current.idCheckCompleted,
      idCheckCompletedAt: parseString(
        objectField(rawDriver, "idCheckCompletedAt"),
        current.idCheckCompletedAt
      ),
      driversLicenseNumber: parseString(
        objectField(rawDriver, "driversLicenseNumber"),
        current.driversLicenseNumber
      ),
      driversLicenseExpiryDate: parseString(
        objectField(rawDriver, "driversLicenseExpiryDate"),
        current.driversLicenseExpiryDate
      ),
      addressLine1: parseString(objectField(rawDriver, "addressLine1"), current.addressLine1),
      addressLine2: parseString(objectField(rawDriver, "addressLine2"), current.addressLine2),
      city: parseString(objectField(rawDriver, "city"), current.city),
      postcode: parseString(objectField(rawDriver, "postcode"), current.postcode),
      emergencyContactName: parseString(
        objectField(rawDriver, "emergencyContactName"),
        current.emergencyContactName
      ),
      emergencyContactPhone: parseString(
        objectField(rawDriver, "emergencyContactPhone"),
        current.emergencyContactPhone
      ),
      vehicleType: parseString(objectField(rawDriver, "vehicleType"), current.vehicleType),
      notes: parseString(objectField(rawDriver, "notes"), current.notes),
      auditTrail: current.auditTrail,
    },
  };
}

function parseLoginRequest(value: unknown): LoginRequest {
  return {
    email: parseString(objectField(value, "email"), ""),
    password: parseString(objectField(value, "password"), ""),
  };
}

function parseValidateRequest(value: unknown): ValidateSessionRequest {
  return {
    token: parseString(objectField(value, "token"), ""),
  };
}

function parseLogoutRequest(value: unknown): LogoutRequest {
  return {
    token: parseString(objectField(value, "token"), ""),
  };
}

const rpcMethods = {
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

type RpcMethod = keyof typeof rpcMethods;

function resolveRpcMethod(method: string): RpcMethod | undefined {
  const entries = Object.entries(rpcMethods);
  for (const [key, value] of entries) {
    if (value === method) {
      if (
        key === "getDriver" ||
        key === "listDrivers" ||
        key === "getDriversByFilters" ||
        key === "batchGetDrivers" ||
        key === "getDriverStats" ||
        key === "updateDriver" ||
        key === "login" ||
        key === "validateSession" ||
        key === "logout"
      ) {
        return key;
      }
    }
  }
  return undefined;
}

function callRpc(method: RpcMethod, params: unknown): unknown {
  if (method === "getDriver") {
    const request = parseGetDriverRequest(params);
    return { driver: db.getDriver(request.id) };
  }
  if (method === "listDrivers") {
    return db.listDrivers(parseListDriversRequest(params));
  }
  if (method === "getDriversByFilters") {
    return db.getDriversByFilters(parseGetDriversByFiltersRequest(params));
  }
  if (method === "batchGetDrivers") {
    const request = parseBatchGetDriversRequest(params);
    return { drivers: db.batchGetDrivers(request.ids) };
  }
  if (method === "getDriverStats") {
    return db.getDriverStats(parseGetDriverStatsRequest(params));
  }
  if (method === "updateDriver") {
    const request = parseUpdateDriverRequest(params);
    if (!request.driver) {
      return { driver: undefined };
    }
    return { driver: db.updateDriver(request.driver, request.actor ?? "system") };
  }
  if (method === "login") {
    return db.login(parseLoginRequest(params));
  }
  if (method === "validateSession") {
    return db.validateSession(parseValidateRequest(params));
  }
  return db.logout(parseLogoutRequest(params));
}

app.post("/rpc", (req, res) => {
  const body = req.body;
  const methodValue = parseString(objectField(body, "method"), "");
  if (!methodValue) {
    res.status(400).json({
      error: { code: "INVALID_REQUEST", message: "Missing method" },
    });
    return;
  }

  const method = resolveRpcMethod(methodValue);
  if (!method) {
    res.status(404).json({
      error: { code: "METHOD_NOT_FOUND", message: `Unknown method: ${methodValue}` },
    });
    return;
  }

  const result = callRpc(method, objectField(body, "params"));
  res.json({ result });
});

const port = Number(process.env.PORT) || 4001;
app.listen(port, () => {
  console.log(`Services listening on http://localhost:${port}`);
});
