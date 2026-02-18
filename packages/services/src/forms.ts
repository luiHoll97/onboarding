import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { connect as connectTls } from "node:tls";
import type {
  CreatePrefilledFormLinkRequest,
  CreatePrefilledFormLinkResponse,
  SendFormInvitationRequest,
  SendFormInvitationResponse,
} from "@driver-onboarding/proto";

type EmailMessage = {
  from: string;
  to: string;
  subject: string;
  html: string;
};

type EmailSendResult = {
  sent: boolean;
  messageId: string;
};

function describeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.trim()) {
      return error.message;
    }
    return error.name || "Unknown error";
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return "Unknown error";
}

type ExternalFormProvider = {
  buildPrefilledUrl(formId: string, prefillFields: Record<string, string>): string;
  id: string;
};

class TypeformProvider implements ExternalFormProvider {
  id = "typeform";

  buildPrefilledUrl(formId: string, prefillFields: Record<string, string>): string {
    const params = new URLSearchParams();
    const entries = Object.entries(prefillFields);
    for (const [key, value] of entries) {
      params.set(key, value);
    }
    return `https://form.typeform.com/to/${encodeURIComponent(formId)}#${params.toString()}`;
  }
}

class LogEmailSender {
  async send(message: EmailMessage): Promise<EmailSendResult> {
    const messageId = `log-${randomUUID()}`;
    console.log("[forms.log-email]", {
      messageId,
      from: message.from,
      to: message.to,
      subject: message.subject,
    });
    return { sent: true, messageId };
  }
}

type SmtpConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
};

class SmtpEmailSender {
  constructor(private readonly config: SmtpConfig) {}

  private async readResponse(socket: ReturnType<typeof connectTls>): Promise<{ code: number; text: string }> {
    return new Promise((resolve, reject) => {
      let buffer = "";
      const onData = (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        const lines = buffer.split("\r\n").filter(Boolean);
        if (lines.length === 0) return;
        const last = lines[lines.length - 1];
        if (last.length < 4) return;
        const code = Number(last.slice(0, 3));
        const continuation = last[3] === "-";
        if (Number.isNaN(code) || continuation) return;

        socket.off("data", onData);
        socket.off("error", onError);
        resolve({ code, text: lines.join("\n") });
      };
      const onError = (error: Error) => {
        socket.off("data", onData);
        socket.off("error", onError);
        reject(error);
      };
      socket.on("data", onData);
      socket.on("error", onError);
    });
  }

  private async command(
    socket: ReturnType<typeof connectTls>,
    command: string,
    expectPrefix: number
  ): Promise<void> {
    socket.write(`${command}\r\n`);
    const response = await this.readResponse(socket);
    if (response.code !== expectPrefix) {
      throw new Error(`SMTP command failed (${command}): ${response.text}`);
    }
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    let phase = "connect";
    const socket = connectTls({
      host: this.config.host,
      port: this.config.port,
      servername: this.config.host,
    });

    try {
      await new Promise<void>((resolve, reject) => {
        socket.once("secureConnect", () => resolve());
        socket.once("error", (error) => reject(error));
      });

      phase = "greeting";
      const greeting = await this.readResponse(socket);
      if (greeting.code !== 220) {
        throw new Error(`SMTP greeting failed: ${greeting.text}`);
      }

      phase = "ehlo";
      await this.command(socket, "EHLO localhost", 250);
      phase = "auth.login";
      await this.command(socket, "AUTH LOGIN", 334);
      phase = "auth.username";
      await this.command(socket, Buffer.from(this.config.username).toString("base64"), 334);
      phase = "auth.password";
      await this.command(socket, Buffer.from(this.config.password).toString("base64"), 235);
      phase = "mail.from";
      await this.command(socket, `MAIL FROM:<${message.from}>`, 250);
      phase = "rcpt.to";
      await this.command(socket, `RCPT TO:<${message.to}>`, 250);
      phase = "data.start";
      await this.command(socket, "DATA", 354);

      const messageId = `<${randomUUID()}@driver-onboarding.local>`;
      const payload = [
        `From: ${message.from}`,
        `To: ${message.to}`,
        `Subject: ${message.subject}`,
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8",
        `Message-ID: ${messageId}`,
        "",
        message.html,
        ".",
      ].join("\r\n");

      phase = "data.body";
      socket.write(`${payload}\r\n`);
      const dataResponse = await this.readResponse(socket);
      if (dataResponse.code !== 250) {
        throw new Error(`SMTP DATA failed: ${dataResponse.text}`);
      }

      phase = "quit";
      await this.command(socket, "QUIT", 221);
      socket.end();

      return { sent: true, messageId };
    } catch (error) {
      socket.destroy();
      throw new Error(
        `SMTP send failed at ${phase} (host=${this.config.host}, port=${this.config.port}): ${describeError(error)}`
      );
    }
  }
}

function buildQrCodeUrl(prefilledUrl: string): string {
  const encoded = encodeURIComponent(prefilledUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}`;
}

function buildDriverAdditionalDetailsEmailHtml(params: {
  firstName: string;
  prefilledUrl: string;
  qrCodeUrl: string;
}): string {
  const { firstName, prefilledUrl, qrCodeUrl } = params;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Driver Application Follow-up</title>
  <style>
    body { margin: 0; padding: 0; background-color: #ffffff; font-family: Arial, sans-serif; color: #333333; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
    .header { background-color: #99ccff; padding: 20px; text-align: center; }
    .header img { max-width: 80%; height: auto; }
    .body { padding: 30px 20px; }
    .body h1 { color: #60a0DB; font-size: 24px; margin-bottom: 10px; }
    .body p { font-size: 16px; line-height: 1.5; margin-bottom: 20px; }
    .button { display: inline-block; padding: 12px 25px; background-color: #60a0DB; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 4px; font-size: 16px; }
    .qr-section { text-align: center; margin-top: 30px; }
    .qr-section img { max-width: 150px; height: auto; }
    @media screen and (max-width: 600px) { .body { padding: 20px 15px; } .header img { max-width: 90%; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://www.responseablesolutions.co.uk/wp-content/uploads/2024/12/RAS-logo-full-20.png" alt="Response Able Solutions Logo">
    </div>

    <div class="body">
      <h1>Hi ${firstName},</h1>
      <p>
        Thanks for your continued interest in the <strong>Driver Role</strong> at Response Able Solutions.
        We just need a little more information from you to help us move forward.
      </p>
      <p>
        Please complete this short form about your availability and basic details.
        It should only take a few minutes.
      </p>
      <p style="text-align:center;">
        <a class="button" href="${prefilledUrl}">Complete the Form</a>
      </p>
    </div>

    <div class="qr-section">
      <p>Or scan the QR code to open the form:</p>
      <img src="${qrCodeUrl}" alt="QR Code to Form">
    </div>

    <div class="body" style="font-size:12px; color:#777777; text-align:center;">
      <p>
        If you have any questions, reply to this email or contact us at <a href="mailto:recruitment@responseablesolutions.com">recruitment@responseablesolutions.com</a>.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function stringField(value: string | undefined): string {
  return value ?? "";
}

export class FormsService {
  private readonly providers: Record<string, ExternalFormProvider>;
  private readonly emailSender: { send(message: EmailMessage): Promise<EmailSendResult> };

  constructor() {
    this.providers = {
      typeform: new TypeformProvider(),
    };

    const smtpHost = process.env.SMTP_HOST ?? "";
    const smtpUser = process.env.SMTP_USER ?? "";
    const smtpPass = process.env.SMTP_PASS ?? "";
    const smtpPort = Number(process.env.SMTP_PORT ?? 465);

    if (smtpHost && smtpUser && smtpPass) {
      this.emailSender = new SmtpEmailSender({
        host: smtpHost,
        port: Number.isFinite(smtpPort) ? smtpPort : 465,
        username: smtpUser,
        password: smtpPass,
      });
    } else {
      this.emailSender = new LogEmailSender();
    }
  }

  private providerById(id: string): ExternalFormProvider {
    const key = id.toLowerCase();
    const provider = this.providers[key];
    if (!provider) {
      throw new Error(`Unknown form provider: ${id}`);
    }
    return provider;
  }

  createPrefilledLink(
    request: CreatePrefilledFormLinkRequest
  ): CreatePrefilledFormLinkResponse {
    const provider = this.providerById(request.provider);
    const prefilledUrl = provider.buildPrefilledUrl(request.formId, request.prefillFields ?? {});
    return {
      prefilledUrl,
      qrCodeUrl: buildQrCodeUrl(prefilledUrl),
    };
  }

  async sendFormInvitation(
    request: SendFormInvitationRequest
  ): Promise<SendFormInvitationResponse> {
    const provider = this.providerById(request.provider);
    const prefilledUrl = provider.buildPrefilledUrl(request.formId, request.prefillFields ?? {});
    const qrCodeUrl = buildQrCodeUrl(prefilledUrl);

    const html = buildDriverAdditionalDetailsEmailHtml({
      firstName: stringField(request.recipientFirstName),
      prefilledUrl,
      qrCodeUrl,
    });

    let sent: EmailSendResult;
    try {
      sent = await this.emailSender.send({
        from: request.senderEmail,
        to: request.recipientEmail,
        subject: request.subject,
        html,
      });
    } catch (error) {
      throw new Error(
        `Forms invitation send failed (provider=${provider.id}, recipient=${request.recipientEmail}, sender=${request.senderEmail}): ${describeError(error)}`
      );
    }

    return {
      sent: sent.sent,
      prefilledUrl,
      qrCodeUrl,
      messageId: sent.messageId,
      provider: provider.id,
    };
  }
}

export function createFormsService(): FormsService {
  return new FormsService();
}
