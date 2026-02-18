/**
 * Stub: run `yarn codegen:proto` to generate real code with buf.
 * This file is overwritten by buf generate.
 */
export interface CreatePrefilledFormLinkRequest {
  provider: string;
  formId: string;
  prefillFields: Record<string, string>;
}

export interface CreatePrefilledFormLinkResponse {
  prefilledUrl: string;
  qrCodeUrl: string;
}

export interface SendFormInvitationRequest {
  provider: string;
  formId: string;
  prefillFields: Record<string, string>;
  recipientEmail: string;
  recipientFirstName: string;
  recipientLastName: string;
  senderEmail: string;
  subject: string;
}

export interface SendFormInvitationResponse {
  sent: boolean;
  prefilledUrl: string;
  qrCodeUrl: string;
  messageId: string;
  provider: string;
}

export interface IngestProviderWebhookRequest {
  provider: string;
  eventName: string;
  externalEventId: string;
  payloadJson: string;
  headers: Record<string, string>;
}

export interface IngestProviderWebhookResponse {
  accepted: boolean;
  duplicate: boolean;
  eventId: string;
  provider: string;
  eventName: string;
}
