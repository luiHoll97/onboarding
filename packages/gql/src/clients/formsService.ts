import type {
  ListWebhookEventsRequest,
  ListWebhookEventsResponse,
  WebhookEventSummary,
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

function parseWebhookEventSummary(value: unknown): WebhookEventSummary {
  return {
    id: parseString(objectField(value, "id"), ""),
    provider: parseString(objectField(value, "provider"), ""),
    eventName: parseString(objectField(value, "eventName"), ""),
    externalEventId: parseString(objectField(value, "externalEventId"), ""),
    status: parseString(objectField(value, "status"), ""),
    attempts: parseInteger(objectField(value, "attempts"), 0),
    createdAt: parseString(objectField(value, "createdAt"), ""),
    processedAt: parseString(objectField(value, "processedAt"), ""),
    errorMessage: parseString(objectField(value, "errorMessage"), ""),
  };
}

function parseListWebhookEventsResponse(value: unknown): ListWebhookEventsResponse {
  if (typeof value !== "object" || value === null) {
    return { events: [] };
  }
  const rawEvents = objectField(value, "events");
  if (!Array.isArray(rawEvents)) {
    return { events: [] };
  }
  return { events: rawEvents.map((item) => parseWebhookEventSummary(item)) };
}

export class FormsServiceClient {
  constructor(private readonly baseUrl: string) {}

  async listWebhookEvents(
    params: ListWebhookEventsRequest
  ): Promise<ListWebhookEventsResponse> {
    const result = await callServicesRpc(
      this.baseUrl,
      driverRpcMethods.listWebhookEvents,
      params
    );
    return parseListWebhookEventsResponse(result);
  }
}
