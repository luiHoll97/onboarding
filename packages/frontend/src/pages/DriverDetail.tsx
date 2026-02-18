import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";

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
  vehicleType
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

type DriverStatus = "PENDING" | "APPROVED" | "REJECTED";

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
  vehicleType?: string | null;
  notes?: string | null;
  auditTrail: AuditEvent[];
};

type DriverData = { driver: Driver | null };
type UpdateData = { updateDriver: Driver | null };

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
  vehicleType: string;
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
    vehicleType: driver.vehicleType ?? "",
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
    status: "PENDING",
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
    vehicleType: "",
    notes: "",
  };
}

function StatusBadge({ status }: { status: DriverStatus }) {
  const className =
    status === "APPROVED"
      ? "status-approved"
      : status === "REJECTED"
        ? "status-rejected"
        : "status-pending";
  return <span className={`status-badge ${className}`}>{status}</span>;
}

export function DriverDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<DriverForm>(emptyForm(id ?? ""));
  const [saveMessage, setSaveMessage] = useState("");

  const { data, loading, error } = useQuery<DriverData>(DRIVER_QUERY, {
    variables: { id: id ?? "" },
    skip: !id,
  });

  const [updateDriver, updateState] = useMutation<UpdateData>(UPDATE_DRIVER_MUTATION);

  useEffect(() => {
    if (data?.driver) {
      setForm(toForm(data.driver));
    }
  }, [data]);

  if (!id) {
    return <div className="error">Missing driver ID.</div>;
  }

  if (loading) return <div className="loading">Loading driver...</div>;
  if (error) return <div className="error">Error: {error.message}</div>;
  if (!data?.driver) {
    return (
      <>
        <div className="error">Driver not found.</div>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginTop: "1rem" }}
          onClick={() => navigate("/")}
        >
          Back to Dashboard
        </button>
      </>
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
      setForm((previous) => ({
        ...previous,
        [field]: value,
      }));
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
          vehicleType: valueOrNull(form.vehicleType),
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

  const auditTrail = [...data.driver.auditTrail].sort((a, b) => {
    return b.timestamp.localeCompare(a.timestamp);
  });

  return (
    <>
      <div className="page-header" style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate("/")}
          aria-label="Back to dashboard"
        >
          Back
        </button>
        <div>
          <h1>{data.driver.name}</h1>
          <p>
            Driver profile and compliance details. Current status: <StatusBadge status={form.status} />
          </p>
        </div>
      </div>

      <form className="driver-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Full name
            <input value={form.name} onChange={onInputChange("name")} required />
          </label>
          <label>
            First name
            <input value={form.firstName} onChange={onInputChange("firstName")} required />
          </label>
          <label>
            Last name
            <input value={form.lastName} onChange={onInputChange("lastName")} required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={onInputChange("email")} required />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={onInputChange("phone")} />
          </label>
          <label>
            Status
            <select value={form.status} onChange={onInputChange("status")}>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>
          <label>
            Applied at
            <input type="datetime-local" value={form.appliedAt} onChange={onInputChange("appliedAt")} />
          </label>
          <label>
            Date of birth
            <input type="date" value={form.dateOfBirth} onChange={onInputChange("dateOfBirth")} />
          </label>
          <label>
            National Insurance number
            <input value={form.nationalInsuranceNumber} onChange={onInputChange("nationalInsuranceNumber")} />
          </label>
          <label>
            Right to work check code
            <input value={form.rightToWorkCheckCode} onChange={onInputChange("rightToWorkCheckCode")} />
          </label>
          <label>
            Interview date
            <input type="datetime-local" value={form.interviewDate} onChange={onInputChange("interviewDate")} />
          </label>
          <label>
            Induction date
            <input type="datetime-local" value={form.inductionDate} onChange={onInputChange("inductionDate")} />
          </label>
          <label>
            ID document type
            <input value={form.idDocumentType} onChange={onInputChange("idDocumentType")} />
          </label>
          <label>
            ID document number
            <input value={form.idDocumentNumber} onChange={onInputChange("idDocumentNumber")} />
          </label>
          <label>
            Driver licence number
            <input value={form.driversLicenseNumber} onChange={onInputChange("driversLicenseNumber")} />
          </label>
          <label>
            Driver licence expiry
            <input
              type="date"
              value={form.driversLicenseExpiryDate}
              onChange={onInputChange("driversLicenseExpiryDate")}
            />
          </label>
          <label>
            Address line 1
            <input value={form.addressLine1} onChange={onInputChange("addressLine1")} />
          </label>
          <label>
            Address line 2
            <input value={form.addressLine2} onChange={onInputChange("addressLine2")} />
          </label>
          <label>
            City
            <input value={form.city} onChange={onInputChange("city")} />
          </label>
          <label>
            Postcode
            <input value={form.postcode} onChange={onInputChange("postcode")} />
          </label>
          <label>
            Emergency contact
            <input value={form.emergencyContactName} onChange={onInputChange("emergencyContactName")} />
          </label>
          <label>
            Emergency phone
            <input value={form.emergencyContactPhone} onChange={onInputChange("emergencyContactPhone")} />
          </label>
          <label>
            Vehicle type
            <input value={form.vehicleType} onChange={onInputChange("vehicleType")} />
          </label>
          <label>
            ID check completed at
            <input
              type="datetime-local"
              value={form.idCheckCompletedAt}
              onChange={onInputChange("idCheckCompletedAt")}
            />
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={form.idCheckCompleted}
              onChange={onInputChange("idCheckCompleted")}
            />
            ID check completed
          </label>
        </div>

        <label>
          Notes
          <textarea value={form.notes} onChange={onInputChange("notes")} rows={4} />
        </label>

        <div className="form-actions">
          <button type="submit" className="btn" disabled={updateState.loading}>
            {updateState.loading ? "Saving..." : "Save Changes"}
          </button>
          {updateState.error ? <span className="error-inline">{updateState.error.message}</span> : null}
          {saveMessage ? <span className="saved-inline">{saveMessage}</span> : null}
        </div>
      </form>

      <section className="audit-trail">
        <h2>Audit Trail</h2>
        {auditTrail.length === 0 ? (
          <p className="empty">No audit events recorded.</p>
        ) : (
          <ul>
            {auditTrail.map((event) => (
              <li key={event.id}>
                <div className="audit-top">
                  <strong>{event.action}</strong>
                  <span>{formatDateTime(event.timestamp)}</span>
                </div>
                <div className="audit-meta">
                  <span>Actor: {event.actor}</span>
                  <span>Field: {event.field}</span>
                </div>
                <div className="audit-change">
                  <code>{event.oldValue || "(empty)"}</code>
                  <span>→</span>
                  <code>{event.newValue || "(empty)"}</code>
                </div>
                <p>{event.note}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
