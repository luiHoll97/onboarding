import { AdminPermission, DriverStatus, type Driver } from "@driver-onboarding/proto";
import type { Resolvers } from "../../generated/graphql.js";
import { requirePermission } from "../auth.js";
import { driverStatusToProto } from "../driver-status.js";

export const CreateDriverMutation: NonNullable<
  Resolvers["Mutation"]
>["createDriver"] = async (_parent, { input, actor }, ctx) => {
  requirePermission(ctx, AdminPermission.EDIT_DRIVERS);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim();
  if (!firstName || !lastName || !email) {
    throw new Error("First name, last name and email are required");
  }

  const driver: Driver = {
    id: "",
    name: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    email,
    phone: input.phone ?? "",
    status: input.status
      ? driverStatusToProto(input.status)
      : DriverStatus.ADDITIONAL_DETAILS_SENT,
    appliedAt: new Date().toISOString(),
    dateOfBirth: "",
    nationalInsuranceNumber: "",
    rightToWorkCheckCode: "",
    inductionDate: "",
    interviewDate: "",
    idDocumentType: "",
    idDocumentNumber: "",
    idCheckCompleted: false,
    idCheckCompletedAt: "",
    driversLicenseNumber: "",
    driversLicenseExpiryDate: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    vehicleType: "",
    preferredDaysPerWeek: "",
    preferredStartDate: "",
    detailsConfirmedByDriver: "",
    notes: input.notes ?? "",
    auditTrail: [],
  };

  const created = await ctx.clients.driverService.createDriver({
    actor: actor ?? "gql-user",
    driver,
  });
  return created.driver ?? null;
};
