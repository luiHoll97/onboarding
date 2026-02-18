import { AdminPermission, type Driver } from "@driver-onboarding/proto";
import type { Resolvers } from "../../generated/graphql.js";
import { requirePermission } from "../auth.js";
import { driverStatusToProto } from "../driver-status.js";

export const UpdateDriverMutation: NonNullable<
  Resolvers["Mutation"]
>["updateDriver"] = async (_parent, { input, actor }, ctx) => {
  requirePermission(ctx, AdminPermission.EDIT_DRIVERS);
  const current = await ctx.clients.driverService.getDriver({ id: input.id });
  if (!current.driver) {
    return null;
  }

  const merged: Driver = {
    ...current.driver,
    id: input.id,
    name: input.name,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone ?? "",
    status: driverStatusToProto(input.status),
    appliedAt: input.appliedAt ?? "",
    dateOfBirth: input.dateOfBirth ?? "",
    nationalInsuranceNumber: input.nationalInsuranceNumber ?? "",
    rightToWorkCheckCode: input.rightToWorkCheckCode ?? "",
    inductionDate: input.inductionDate ?? "",
    interviewDate: input.interviewDate ?? "",
    idDocumentType: input.idDocumentType ?? "",
    idDocumentNumber: input.idDocumentNumber ?? "",
    idCheckCompleted: input.idCheckCompleted,
    idCheckCompletedAt: input.idCheckCompletedAt ?? "",
    driversLicenseNumber: input.driversLicenseNumber ?? "",
    driversLicenseExpiryDate: input.driversLicenseExpiryDate ?? "",
    addressLine1: input.addressLine1 ?? "",
    addressLine2: input.addressLine2 ?? "",
    city: input.city ?? "",
    postcode: input.postcode ?? "",
    emergencyContactName: input.emergencyContactName ?? "",
    emergencyContactPhone: input.emergencyContactPhone ?? "",
    emergencyContactRelationship: input.emergencyContactRelationship ?? "",
    vehicleType: input.vehicleType ?? "",
    preferredDaysPerWeek: input.preferredDaysPerWeek ?? "",
    preferredStartDate: input.preferredStartDate ?? "",
    detailsConfirmedByDriver: input.detailsConfirmedByDriver ?? "",
    notes: input.notes ?? "",
    auditTrail: current.driver.auditTrail,
  };

  const updated = await ctx.clients.driverService.updateDriver({
    actor: actor ?? "gql-user",
    driver: merged,
  });

  return updated.driver ?? null;
};
