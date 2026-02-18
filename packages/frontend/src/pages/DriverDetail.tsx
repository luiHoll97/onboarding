import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import {
  DRIVER_STATUS_VALUES,
  driverStatusColors,
  driverStatusLabels,
  type DriverStatus,
} from "../driverStatus.ts";

const DRIVER_FIELDS = `
  id
  name
  firstName
  lastName
  email
  phone
  status
  appliedAt
  dateOfBirth
  nationalInsuranceNumber
  rightToWorkCheckCode
  inductionDate
  interviewDate
  idDocumentType
  idDocumentNumber
  idCheckCompleted
  idCheckCompletedAt
  driversLicenseNumber
  driversLicenseExpiryDate
  addressLine1
  addressLine2
  city
  postcode
  emergencyContactName
  emergencyContactPhone
  emergencyContactRelationship
  vehicleType
  preferredDaysPerWeek
  preferredStartDate
  detailsConfirmedByDriver
  notes
  auditTrail {
    id
    actor
    action
    timestamp
    field
    oldValue
    newValue
    note
  }
`;

const DRIVER_QUERY = gql`
  query Driver($id: ID!) {
    driver(id: $id) {
      ${DRIVER_FIELDS}
    }
  }
`;

const UPDATE_DRIVER_MUTATION = gql`
  mutation UpdateDriver($input: UpdateDriverInput!, $actor: String) {
    updateDriver(input: $input, actor: $actor) {
      ${DRIVER_FIELDS}
    }
  }
`;

const SEND_ADDITIONAL_DETAILS_FORM_MUTATION = gql`
  mutation SendAdditionalDetailsForm($driverId: ID!, $mondayId: String) {
    sendAdditionalDetailsForm(driverId: $driverId, mondayId: $mondayId) {
      sent
      prefilledUrl
      qrCodeUrl
      messageId
      provider
    }
  }
`;

const ME_PERMISSIONS_QUERY = gql`
  query MePermissions {
    me {
      id
      permissions
    }
  }
`;

type AuditEvent = {
  id: string;
  actor: string;
  action: "CREATED" | "UPDATED" | "STATUS_CHANGED";
  timestamp: string;
  field: string;
  oldValue: string;
  newValue: string;
  note: string;
};

type Driver = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  status: DriverStatus;
  appliedAt?: string | null;
  dateOfBirth?: string | null;
  nationalInsuranceNumber?: string | null;
  rightToWorkCheckCode?: string | null;
  inductionDate?: string | null;
  interviewDate?: string | null;
  idDocumentType?: string | null;
  idDocumentNumber?: string | null;
  idCheckCompleted: boolean;
  idCheckCompletedAt?: string | null;
  driversLicenseNumber?: string | null;
  driversLicenseExpiryDate?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postcode?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
  vehicleType?: string | null;
  preferredDaysPerWeek?: string | null;
  preferredStartDate?: string | null;
  detailsConfirmedByDriver?: string | null;
  notes?: string | null;
  auditTrail: AuditEvent[];
};

type DriverData = { driver: Driver | null };
type UpdateData = { updateDriver: Driver | null };
type SendAdditionalDetailsData = {
  sendAdditionalDetailsForm: {
    sent: boolean;
    prefilledUrl: string;
    qrCodeUrl: string;
    messageId: string;
    provider: string;
  };
};

type MePermissionsData = {
  me: {
    id: string;
    permissions: string[];
  } | null;
};

type DriverForm = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: DriverStatus;
  appliedAt: string;
  dateOfBirth: string;
  nationalInsuranceNumber: string;
  rightToWorkCheckCode: string;
  inductionDate: string;
  interviewDate: string;
  idDocumentType: string;
  idDocumentNumber: string;
  idCheckCompleted: boolean;
  idCheckCompletedAt: string;
  driversLicenseNumber: string;
  driversLicenseExpiryDate: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postcode: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  vehicleType: string;
  preferredDaysPerWeek: string;
  preferredStartDate: string;
  detailsConfirmedByDriver: string;
  notes: string;
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function toDateTimeInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function toIsoFromDateTimeInput(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function valueOrNull(value: string): string | null {
  return value.trim() ? value : null;
}

function toForm(driver: Driver): DriverForm {
  return {
    id: driver.id,
    name: driver.name,
    firstName: driver.firstName,
    lastName: driver.lastName,
    email: driver.email,
    phone: driver.phone ?? "",
    status: driver.status,
    appliedAt: toDateTimeInput(driver.appliedAt),
    dateOfBirth: toDateInput(driver.dateOfBirth),
    nationalInsuranceNumber: driver.nationalInsuranceNumber ?? "",
    rightToWorkCheckCode: driver.rightToWorkCheckCode ?? "",
    inductionDate: toDateTimeInput(driver.inductionDate),
    interviewDate: toDateTimeInput(driver.interviewDate),
    idDocumentType: driver.idDocumentType ?? "",
    idDocumentNumber: driver.idDocumentNumber ?? "",
    idCheckCompleted: driver.idCheckCompleted,
    idCheckCompletedAt: toDateTimeInput(driver.idCheckCompletedAt),
    driversLicenseNumber: driver.driversLicenseNumber ?? "",
    driversLicenseExpiryDate: toDateInput(driver.driversLicenseExpiryDate),
    addressLine1: driver.addressLine1 ?? "",
    addressLine2: driver.addressLine2 ?? "",
    city: driver.city ?? "",
    postcode: driver.postcode ?? "",
    emergencyContactName: driver.emergencyContactName ?? "",
    emergencyContactPhone: driver.emergencyContactPhone ?? "",
    emergencyContactRelationship: driver.emergencyContactRelationship ?? "",
    vehicleType: driver.vehicleType ?? "",
    preferredDaysPerWeek: driver.preferredDaysPerWeek ?? "",
    preferredStartDate: toDateInput(driver.preferredStartDate),
    detailsConfirmedByDriver: driver.detailsConfirmedByDriver ?? "",
    notes: driver.notes ?? "",
  };
}

function emptyForm(id: string): DriverForm {
  return {
    id,
    name: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    status: "ADDITIONAL_DETAILS_SENT",
    appliedAt: "",
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
    notes: "",
  };
}

function StatusBadge({ status }: { status: DriverStatus }) {
  const classes = driverStatusColors[status];
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${classes}`}>
      {driverStatusLabels[status]}
    </span>
  );
}

function inputClassName() {
  return "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2";
}

export function DriverDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<DriverForm>(emptyForm(id ?? ""));
  const [saveMessage, setSaveMessage] = useState("");
  const [sendMessage, setSendMessage] = useState("");

  const { data, loading, error } = useQuery<DriverData>(DRIVER_QUERY, {
    variables: { id: id ?? "" },
    skip: !id,
  });
  const { data: meData } = useQuery<MePermissionsData>(ME_PERMISSIONS_QUERY, {
    fetchPolicy: "cache-first",
  });

  const [updateDriver, updateState] = useMutation<UpdateData>(UPDATE_DRIVER_MUTATION);
  const [sendAdditionalDetailsForm, sendState] =
    useMutation<SendAdditionalDetailsData>(SEND_ADDITIONAL_DETAILS_FORM_MUTATION);
  const canEditDrivers = meData?.me?.permissions.includes("EDIT_DRIVERS") ?? false;

  useEffect(() => {
    if (data?.driver) {
      setForm(toForm(data.driver));
    }
  }, [data]);

  if (!id) {
    return <div className="py-8 text-center text-red-700">Missing driver ID.</div>;
  }

  if (loading) return <div className="py-8 text-center text-slate-500">Loading driver...</div>;
  if (error) return <div className="py-8 text-center text-red-700">Error: {error.message}</div>;
  if (!data?.driver) {
    return (
      <div className="space-y-3">
        <div className="py-6 text-center text-red-700">Driver not found.</div>
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          onClick={() => navigate("/")}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const onInputChange =
    (field: keyof DriverForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value =
        event.currentTarget instanceof HTMLInputElement &&
        event.currentTarget.type === "checkbox"
          ? event.currentTarget.checked
          : event.currentTarget.value;
      setSaveMessage("");
      setForm((previous) => ({ ...previous, [field]: value }));
    };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage("");

    const result = await updateDriver({
      variables: {
        actor: "frontend-user",
        input: {
          id: form.id,
          name: form.name,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: valueOrNull(form.phone),
          status: form.status,
          appliedAt: valueOrNull(toIsoFromDateTimeInput(form.appliedAt)),
          dateOfBirth: valueOrNull(form.dateOfBirth),
          nationalInsuranceNumber: valueOrNull(form.nationalInsuranceNumber),
          rightToWorkCheckCode: valueOrNull(form.rightToWorkCheckCode),
          inductionDate: valueOrNull(toIsoFromDateTimeInput(form.inductionDate)),
          interviewDate: valueOrNull(toIsoFromDateTimeInput(form.interviewDate)),
          idDocumentType: valueOrNull(form.idDocumentType),
          idDocumentNumber: valueOrNull(form.idDocumentNumber),
          idCheckCompleted: form.idCheckCompleted,
          idCheckCompletedAt: valueOrNull(toIsoFromDateTimeInput(form.idCheckCompletedAt)),
          driversLicenseNumber: valueOrNull(form.driversLicenseNumber),
          driversLicenseExpiryDate: valueOrNull(form.driversLicenseExpiryDate),
          addressLine1: valueOrNull(form.addressLine1),
          addressLine2: valueOrNull(form.addressLine2),
          city: valueOrNull(form.city),
          postcode: valueOrNull(form.postcode),
          emergencyContactName: valueOrNull(form.emergencyContactName),
          emergencyContactPhone: valueOrNull(form.emergencyContactPhone),
          emergencyContactRelationship: valueOrNull(form.emergencyContactRelationship),
          vehicleType: valueOrNull(form.vehicleType),
          preferredDaysPerWeek: valueOrNull(form.preferredDaysPerWeek),
          preferredStartDate: valueOrNull(form.preferredStartDate),
          detailsConfirmedByDriver: valueOrNull(form.detailsConfirmedByDriver),
          notes: valueOrNull(form.notes),
        },
      },
      refetchQueries: [{ query: DRIVER_QUERY, variables: { id } }],
    });

    if (result.data?.updateDriver) {
      setForm(toForm(result.data.updateDriver));
      setSaveMessage("Saved successfully.");
    }
  }

  async function onSendAdditionalDetailsForm() {
    if (!id) {
      return;
    }
    setSendMessage("");
    const result = await sendAdditionalDetailsForm({
      variables: {
        driverId: id,
        mondayId: id,
      },
    });

    const payload = result.data?.sendAdditionalDetailsForm;
    if (payload?.sent) {
      setSendMessage(`Email sent. Form link: ${payload.prefilledUrl}`);
      return;
    }
    setSendMessage("Unable to send additional details form email.");
  }

  const auditTrail = [...data.driver.auditTrail].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const detailsConfirmedNo = form.detailsConfirmedByDriver.toLowerCase() === "no";

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          onClick={() => navigate("/")}
          aria-label="Back to dashboard"
        >
          Back
        </button>
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-slate-900">{data.driver.name}</h1>
          <p className="text-sm text-slate-500">
            Driver profile and compliance details. Current status: <StatusBadge status={form.status} />
          </p>
        </div>
        <button
          type="button"
          onClick={onSendAdditionalDetailsForm}
          disabled={sendState.loading}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {sendState.loading ? "Sending..." : "Send Additional Details Form"}
        </button>
      </div>
      {sendState.error ? (
        <p className="mb-4 text-sm text-red-700">{sendState.error.message}</p>
      ) : null}
      {sendMessage ? (
        <p className="mb-4 break-all text-sm text-emerald-700">{sendMessage}</p>
      ) : null}
      {!canEditDrivers ? (
        <p className="mb-4 text-sm text-amber-700">
          You have read-only access. Driver edits require the EDIT_DRIVERS permission.
        </p>
      ) : null}
      {detailsConfirmedNo ? (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Driver marked details as not confirmed in Typeform. Review this profile before progressing.
        </div>
      ) : null}

      <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={onSubmit}>
        <fieldset disabled={!canEditDrivers}>
          <section className="mb-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Basic Details</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="grid gap-1 text-sm text-slate-500">Full name<input className={inputClassName()} value={form.name} onChange={onInputChange("name")} required /></label>
              <label className="grid gap-1 text-sm text-slate-500">First name<input className={inputClassName()} value={form.firstName} onChange={onInputChange("firstName")} required /></label>
              <label className="grid gap-1 text-sm text-slate-500">Last name<input className={inputClassName()} value={form.lastName} onChange={onInputChange("lastName")} required /></label>
              <label className="grid gap-1 text-sm text-slate-500">Email<input className={inputClassName()} type="email" value={form.email} onChange={onInputChange("email")} required /></label>
              <label className="grid gap-1 text-sm text-slate-500">Phone<input className={inputClassName()} value={form.phone} onChange={onInputChange("phone")} /></label>
              <label className="grid gap-1 text-sm text-slate-500">
                Status
                <select className={inputClassName()} value={form.status} onChange={onInputChange("status")}>
                  {DRIVER_STATUS_VALUES.map((status) => (
                    <option key={status} value={status}>
                      {driverStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm text-slate-500">Applied at<input className={inputClassName()} type="datetime-local" value={form.appliedAt} onChange={onInputChange("appliedAt")} /></label>
              <label className="grid gap-1 text-sm text-slate-500">Date of birth<input className={inputClassName()} type="date" value={form.dateOfBirth} onChange={onInputChange("dateOfBirth")} /></label>
              <label className="grid gap-1 text-sm text-slate-500">Vehicle type<input className={inputClassName()} value={form.vehicleType} onChange={onInputChange("vehicleType")} /></label>
            </div>
          </section>

          <section className="mb-5 border-t border-slate-200 pt-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Compliance</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="grid gap-1 text-sm text-slate-500">National Insurance number<input className={inputClassName()} value={form.nationalInsuranceNumber} onChange={onInputChange("nationalInsuranceNumber")} /></label>
              <label className="grid gap-1 text-sm text-slate-500">Right to work check code<input className={inputClassName()} value={form.rightToWorkCheckCode} onChange={onInputChange("rightToWorkCheckCode")} /></label>
              <label className="grid gap-1 text-sm text-slate-500">Interview date<input className={inputClassName()} type="datetime-local" value={form.interviewDate} onChange={onInputChange("interviewDate")} /></label>
              <label className="grid gap-1 text-sm text-slate-500">Induction date<input className={inputClassName()} type="datetime-local" value={form.inductionDate} onChange={onInputChange("inductionDate")} /></label>
              <label className="grid gap-1 text-sm text-slate-500">ID document type<input className={inputClassName()} value={form.idDocumentType} onChange={onInputChange("idDocumentType")} /></label>
              <label className="grid gap-1 text-sm text-slate-500">ID document number<input className={inputClassName()} value={form.idDocumentNumber} onChange={onInputChange("idDocumentNumber")} /></label>
              <label className="grid gap-1 text-sm text-slate-500">Driver licence number<input className={inputClassName()} value={form.driversLicenseNumber} onChange={onInputChange("driversLicenseNumber")} /></label>
              <label className="grid gap-1 text-sm text-slate-500">Driver licence expiry<input className={inputClassName()} type="date" value={form.driversLicenseExpiryDate} onChange={onInputChange("driversLicenseExpiryDate")} /></label>
              <label className="grid gap-1 text-sm text-slate-500">ID check completed at<input className={inputClassName()} type="datetime-local" value={form.idCheckCompletedAt} onChange={onInputChange("idCheckCompletedAt")} /></label>
              <label className="flex items-center gap-2 self-end text-sm text-slate-600"><input className="h-4 w-4" type="checkbox" checked={form.idCheckCompleted} onChange={onInputChange("idCheckCompleted")} />ID check completed</label>
            </div>
          </section>

          <section className="mb-5 border-t border-slate-200 pt-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Address</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="grid gap-1 text-sm text-slate-500">Address line 1<input className={inputClassName()} value={form.addressLine1} onChange={onInputChange("addressLine1")} /></label>
              <label className="grid gap-1 text-sm text-slate-500">Address line 2<input className={inputClassName()} value={form.addressLine2} onChange={onInputChange("addressLine2")} /></label>
              <label className="grid gap-1 text-sm text-slate-500">City<input className={inputClassName()} value={form.city} onChange={onInputChange("city")} /></label>
              <label className="grid gap-1 text-sm text-slate-500">Postcode<input className={inputClassName()} value={form.postcode} onChange={onInputChange("postcode")} /></label>
            </div>
          </section>

          <section className="mb-5 border-t border-slate-200 pt-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Emergency Contact</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="grid gap-1 text-sm text-slate-500">Emergency contact<input className={inputClassName()} value={form.emergencyContactName} onChange={onInputChange("emergencyContactName")} /></label>
              <label className="grid gap-1 text-sm text-slate-500">Emergency phone<input className={inputClassName()} value={form.emergencyContactPhone} onChange={onInputChange("emergencyContactPhone")} /></label>
              <label className="grid gap-1 text-sm text-slate-500">Relationship<input className={inputClassName()} value={form.emergencyContactRelationship} onChange={onInputChange("emergencyContactRelationship")} /></label>
            </div>
          </section>

          <section className="mb-5 border-t border-slate-200 pt-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Availability Preferences</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="grid gap-1 text-sm text-slate-500">Preferred days per week<input className={inputClassName()} value={form.preferredDaysPerWeek} onChange={onInputChange("preferredDaysPerWeek")} /></label>
              <label className="grid gap-1 text-sm text-slate-500">Preferred start date<input className={inputClassName()} type="date" value={form.preferredStartDate} onChange={onInputChange("preferredStartDate")} /></label>
              <label className="grid gap-1 text-sm text-slate-500">Details confirmed by driver<select className={inputClassName()} value={form.detailsConfirmedByDriver} onChange={onInputChange("detailsConfirmedByDriver")}><option value="">Unknown</option><option value="yes">Yes</option><option value="no">No</option></select></label>
            </div>
          </section>

          <label className="grid gap-1 text-sm text-slate-500">
            Notes
            <textarea
              value={form.notes}
              onChange={onInputChange("notes")}
              rows={4}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            />
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60" disabled={updateState.loading}>
              {updateState.loading ? "Saving..." : "Save Changes"}
            </button>
            {updateState.error ? <span className="text-sm text-red-700">{updateState.error.message}</span> : null}
            {saveMessage ? <span className="text-sm text-emerald-700">{saveMessage}</span> : null}
          </div>
        </fieldset>
      </form>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Audit Trail</h2>
        {auditTrail.length === 0 ? (
          <p className="text-sm text-slate-500">No audit events recorded.</p>
        ) : (
          <ul className="grid gap-3">
            {auditTrail.map((event) => (
              <li key={event.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <strong className="text-slate-900">{event.action}</strong>
                  <span className="text-slate-500">{formatDateTime(event.timestamp)}</span>
                </div>
                <div className="mb-2 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>Actor: {event.actor}</span>
                  <span>Field: {event.field}</span>
                </div>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <code className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-slate-700">{event.oldValue || "(empty)"}</code>
                  <span className="text-slate-500">→</span>
                  <code className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-slate-700">{event.newValue || "(empty)"}</code>
                </div>
                <p className="text-sm text-slate-700">{event.note}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
