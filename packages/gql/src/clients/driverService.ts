import {
  DriverStatus,
  type AuditAction,
  type AuditEvent,
  type BatchGetDriversRequest,
  type BatchGetDriversResponse,
  type Driver,
  type GetDriverRequest,
  type GetDriverResponse,
  type GetDriversByFiltersRequest,
  type GetDriversByFiltersResponse,
  type GetDriverStatsRequest,
  type GetDriverStatsResponse,
  type ListDriversRequest,
  type ListDriversResponse,
  type SendAdditionalDetailsFormRequest,
  type SendAdditionalDetailsFormResponse,
  type UpdateDriverRequest,
  type UpdateDriverResponse,
} from "@driver-onboarding/proto";
import { callServicesRpc, driverRpcMethods } from "../rpc.js";

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

function parseBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
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

function parseDriverStatus(value: unknown, fallback: DriverStatus): DriverStatus {
  if (value === DriverStatus.PENDING) return DriverStatus.PENDING;
  if (value === DriverStatus.APPROVED) return DriverStatus.APPROVED;
  if (value === DriverStatus.REJECTED) return DriverStatus.REJECTED;
  return fallback;
}

function parseAuditAction(value: unknown): AuditAction {
  if (value === 1) return 1;
  if (value === 2) return 2;
  if (value === 3) return 3;
  return 0;
}

function parseAuditEvent(value: unknown): AuditEvent {
  return {
    id: parseString(objectField(value, "id"), ""),
    actor: parseString(objectField(value, "actor"), ""),
    action: parseAuditAction(objectField(value, "action")),
    timestamp: parseString(objectField(value, "timestamp"), ""),
    field: parseString(objectField(value, "field"), ""),
    oldValue: parseString(objectField(value, "oldValue"), ""),
    newValue: parseString(objectField(value, "newValue"), ""),
    note: parseString(objectField(value, "note"), ""),
  };
}

function parseDriver(value: unknown): Driver {
  const rawAuditTrail = objectField(value, "auditTrail");
  const auditTrail = Array.isArray(rawAuditTrail)
    ? rawAuditTrail.map((event) => parseAuditEvent(event))
    : [];

  return {
    id: parseString(objectField(value, "id"), ""),
    name: parseString(objectField(value, "name"), ""),
    firstName: parseString(objectField(value, "firstName"), ""),
    lastName: parseString(objectField(value, "lastName"), ""),
    email: parseString(objectField(value, "email"), ""),
    phone: parseString(objectField(value, "phone"), ""),
    status: parseDriverStatus(objectField(value, "status"), DriverStatus.PENDING),
    appliedAt: parseString(objectField(value, "appliedAt"), ""),
    dateOfBirth: parseString(objectField(value, "dateOfBirth"), ""),
    nationalInsuranceNumber: parseString(
      objectField(value, "nationalInsuranceNumber"),
      ""
    ),
    rightToWorkCheckCode: parseString(
      objectField(value, "rightToWorkCheckCode"),
      ""
    ),
    inductionDate: parseString(objectField(value, "inductionDate"), ""),
    interviewDate: parseString(objectField(value, "interviewDate"), ""),
    idDocumentType: parseString(objectField(value, "idDocumentType"), ""),
    idDocumentNumber: parseString(objectField(value, "idDocumentNumber"), ""),
    idCheckCompleted: parseBoolean(objectField(value, "idCheckCompleted"), false),
    idCheckCompletedAt: parseString(objectField(value, "idCheckCompletedAt"), ""),
    driversLicenseNumber: parseString(
      objectField(value, "driversLicenseNumber"),
      ""
    ),
    driversLicenseExpiryDate: parseString(
      objectField(value, "driversLicenseExpiryDate"),
      ""
    ),
    addressLine1: parseString(objectField(value, "addressLine1"), ""),
    addressLine2: parseString(objectField(value, "addressLine2"), ""),
    city: parseString(objectField(value, "city"), ""),
    postcode: parseString(objectField(value, "postcode"), ""),
    emergencyContactName: parseString(objectField(value, "emergencyContactName"), ""),
    emergencyContactPhone: parseString(
      objectField(value, "emergencyContactPhone"),
      ""
    ),
    emergencyContactRelationship: parseString(
      objectField(value, "emergencyContactRelationship"),
      ""
    ),
    vehicleType: parseString(objectField(value, "vehicleType"), ""),
    preferredDaysPerWeek: parseString(objectField(value, "preferredDaysPerWeek"), ""),
    preferredStartDate: parseString(objectField(value, "preferredStartDate"), ""),
    detailsConfirmedByDriver: parseString(
      objectField(value, "detailsConfirmedByDriver"),
      ""
    ),
    notes: parseString(objectField(value, "notes"), ""),
    auditTrail,
  };
}

function parseDriversList(value: unknown): Driver[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((driver) => parseDriver(driver));
}

function parseGetDriverResponse(value: unknown): GetDriverResponse {
  const rawDriver = objectField(value, "driver");
  return {
    driver: rawDriver ? parseDriver(rawDriver) : undefined,
  };
}

function parseListDriversResponse(value: unknown): ListDriversResponse {
  return {
    drivers: parseDriversList(objectField(value, "drivers")),
    nextPageToken: parseString(objectField(value, "nextPageToken"), ""),
  };
}

function parseGetDriversByFiltersResponse(
  value: unknown
): GetDriversByFiltersResponse {
  return {
    drivers: parseDriversList(objectField(value, "drivers")),
    nextPageToken: parseString(objectField(value, "nextPageToken"), ""),
  };
}

function parseBatchGetDriversResponse(value: unknown): BatchGetDriversResponse {
  return {
    drivers: parseDriversList(objectField(value, "drivers")),
  };
}

function parseGetDriverStatsResponse(value: unknown): GetDriverStatsResponse {
  const rawByStatus = objectField(value, "byStatus");
  const byStatus: Record<string, number> = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
  };

  if (typeof rawByStatus === "object" && rawByStatus !== null) {
    byStatus.PENDING = parseInteger(objectField(rawByStatus, "PENDING"), 0);
    byStatus.APPROVED = parseInteger(objectField(rawByStatus, "APPROVED"), 0);
    byStatus.REJECTED = parseInteger(objectField(rawByStatus, "REJECTED"), 0);
  }

  return {
    byStatus,
    total: parseInteger(objectField(value, "total"), 0),
  };
}

function parseUpdateDriverResponse(value: unknown): UpdateDriverResponse {
  const rawDriver = objectField(value, "driver");
  return {
    driver: rawDriver ? parseDriver(rawDriver) : undefined,
  };
}

function parseSendAdditionalDetailsFormResponse(
  value: unknown
): SendAdditionalDetailsFormResponse {
  return {
    sent: parseBoolean(objectField(value, "sent"), false),
    prefilledUrl: parseString(objectField(value, "prefilledUrl"), ""),
    qrCodeUrl: parseString(objectField(value, "qrCodeUrl"), ""),
    messageId: parseString(objectField(value, "messageId"), ""),
  };
}

export class DriverServiceClient {
  constructor(private readonly baseUrl: string) {}

  async getDriver(params: GetDriverRequest): Promise<GetDriverResponse> {
    const result = await callServicesRpc(
      this.baseUrl,
      driverRpcMethods.getDriver,
      params
    );
    return parseGetDriverResponse(result);
  }

  async listDrivers(params: ListDriversRequest): Promise<ListDriversResponse> {
    const result = await callServicesRpc(
      this.baseUrl,
      driverRpcMethods.listDrivers,
      params
    );
    return parseListDriversResponse(result);
  }

  async getDriversByFilters(
    params: GetDriversByFiltersRequest
  ): Promise<GetDriversByFiltersResponse> {
    const result = await callServicesRpc(
      this.baseUrl,
      driverRpcMethods.getDriversByFilters,
      params
    );
    return parseGetDriversByFiltersResponse(result);
  }

  async batchGetDrivers(
    params: BatchGetDriversRequest
  ): Promise<BatchGetDriversResponse> {
    const result = await callServicesRpc(
      this.baseUrl,
      driverRpcMethods.batchGetDrivers,
      params
    );
    return parseBatchGetDriversResponse(result);
  }

  async getDriverStats(
    params: GetDriverStatsRequest
  ): Promise<GetDriverStatsResponse> {
    const result = await callServicesRpc(
      this.baseUrl,
      driverRpcMethods.getDriverStats,
      params
    );
    return parseGetDriverStatsResponse(result);
  }

  async updateDriver(params: UpdateDriverRequest): Promise<UpdateDriverResponse> {
    const result = await callServicesRpc(
      this.baseUrl,
      driverRpcMethods.updateDriver,
      params
    );
    return parseUpdateDriverResponse(result);
  }

  async sendAdditionalDetailsForm(
    params: SendAdditionalDetailsFormRequest
  ): Promise<SendAdditionalDetailsFormResponse> {
    const result = await callServicesRpc(
      this.baseUrl,
      driverRpcMethods.sendAdditionalDetailsForm,
      params
    );
    return parseSendAdditionalDetailsFormResponse(result);
  }
}
