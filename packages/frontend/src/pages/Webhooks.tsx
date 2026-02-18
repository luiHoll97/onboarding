const webhookRows = [
  {
    provider: "Typeform",
    event: "submission.received",
    url: "https://onboarding-26cg.onrender.com/webhooks/typeform/submission.received",
    notes: "Preferred endpoint",
  },
  {
    provider: "Typeform",
    event: "legacy",
    url: "https://onboarding-26cg.onrender.com/webhooks/typeform",
    notes: "Backward-compatible alias",
  },
];

const mappingRows = [
  { source: "hidden.monday_id", mappedTo: "driver.id lookup", targetField: "Driver match key" },
  { source: "hidden.email", mappedTo: "email", targetField: "Driver.email" },
  { source: "hidden.first_name", mappedTo: "first_name", targetField: "Driver.firstName" },
  { source: "hidden.last_name", mappedTo: "last_name", targetField: "Driver.lastName" },
  { source: "hidden.phone_number", mappedTo: "phone_number", targetField: "Driver.phone" },
  {
    source: "d2745455-71ba-4d31-a07b-c675350b8730",
    mappedTo: "date_of_birth",
    targetField: "Driver.dateOfBirth",
  },
  {
    source: "92fc8a3f-466e-4dbf-825b-5c1f211c3940",
    mappedTo: "national_insurance_number",
    targetField: "Driver.nationalInsuranceNumber",
  },
  {
    source: "ddd7b1a2-972a-48e5-9fe8-e8204c5de29b",
    mappedTo: "emergency_contact_name",
    targetField: "Driver.emergencyContactName",
  },
  {
    source: "acff250a-11fe-4845-affc-b5db5c5cea7f",
    mappedTo: "emergency_contact_phone",
    targetField: "Driver.emergencyContactPhone",
  },
  {
    source: "02bac3a4-d6e6-4bd8-a944-8648612ab95f",
    mappedTo: "emergency_contact_relationship",
    targetField: "Driver.emergencyContactRelationship",
  },
  {
    source: "185eb1c7-20bb-4ea9-984a-a8aa1732c01e",
    mappedTo: "preferred_days_per_week",
    targetField: "Driver.preferredDaysPerWeek",
  },
  {
    source: "b458f157-4547-4279-bc8f-7f1a5f341413",
    mappedTo: "preferred_start_day",
    targetField: "Driver.notes",
  },
  {
    source: "07cc1c10-b4e4-4f01-9774-073cb5cae0f8",
    mappedTo: "preferred_start_date",
    targetField: "Driver.preferredStartDate",
  },
  {
    source: "bbc1908b-14c5-4b99-8365-5055c2c9cefc",
    mappedTo: "details_confirmed",
    targetField: "Driver.detailsConfirmedByDriver (yes/no)",
  },
];

export function Webhooks() {
  const { data, loading, error } = useQuery<WebhookEventsData>(WEBHOOK_EVENTS_QUERY, {
    variables: { provider: "typeform", limit: 50 },
    fetchPolicy: "network-only",
  });
  const events = data?.webhooks ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Webhooks</h1>
        <p className="text-sm text-slate-500">
          Catch URLs and current provider field mapping.
        </p>
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Catch URLs</h2>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Provider
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Event
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                URL
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {webhookRows.map((row) => (
              <tr key={`${row.provider}-${row.event}`}>
                <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                  {row.provider}
                </td>
                <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                  {row.event}
                </td>
                <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <code className="break-all">{row.url}</code>
                </td>
                <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                  {row.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Typeform Mapping Table</h2>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Source Key / Ref
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Normalized Key
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Driver Field
              </th>
            </tr>
          </thead>
          <tbody>
            {mappingRows.map((row) => (
              <tr key={row.source}>
                <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <code>{row.source}</code>
                </td>
                <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <code>{row.mappedTo}</code>
                </td>
                <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <code>{row.targetField}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Recent Webhook Events</h2>
        </div>
        {loading ? (
          <p className="px-4 py-3 text-sm text-slate-500">Loading recent events...</p>
        ) : error ? (
          <p className="px-4 py-3 text-sm text-red-700">Error: {error.message}</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Provider
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Event
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Attempts
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Created
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Error
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                    {event.provider}
                  </td>
                  <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                    <div className="font-medium">{event.eventName}</div>
                    <div className="text-xs text-slate-500">{event.externalEventId}</div>
                  </td>
                  <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                    {event.status}
                  </td>
                  <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                    {event.attempts}
                  </td>
                  <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                    {event.createdAt}
                  </td>
                  <td className="border-b border-slate-200 px-4 py-3 text-sm text-red-700">
                    {event.errorMessage || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

const WEBHOOK_EVENTS_QUERY = gql`
  query Webhooks($provider: String, $limit: Int) {
    webhooks(provider: $provider, limit: $limit) {
      id
      provider
      eventName
      externalEventId
      status
      attempts
      createdAt
      processedAt
      errorMessage
    }
  }
`;

type WebhookEvent = {
  id: string;
  provider: string;
  eventName: string;
  externalEventId: string;
  status: string;
  attempts: number;
  createdAt: string;
  processedAt: string;
  errorMessage: string;
};

type WebhookEventsData = {
  webhooks: WebhookEvent[];
};
