import nodemailer from "nodemailer";

interface EmailMessageInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let cachedTransport:
  | {
      transport: nodemailer.Transporter;
      from: string;
    }
  | null
  | undefined;

function parsePort(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
}

function getEmailConfig():
  | {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
      from: string;
    }
  | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim();

  if (!host || !user || !pass || !from) {
    return null;
  }

  const port = parsePort(process.env.SMTP_PORT);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  return { host, port, secure, user, pass, from };
}

function getEmailTransport():
  | {
      transport: nodemailer.Transporter;
      from: string;
    }
  | null {
  if (cachedTransport !== undefined) {
    return cachedTransport;
  }

  const config = getEmailConfig();
  if (!config) {
    cachedTransport = null;
    return cachedTransport;
  }

  cachedTransport = {
    transport: nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    }),
    from: config.from,
  };

  return cachedTransport;
}

export function isEmailDeliveryConfigured(): boolean {
  return getEmailTransport() !== null;
}

export async function sendEmailMessage(input: EmailMessageInput): Promise<boolean> {
  const emailTransport = getEmailTransport();
  if (!emailTransport) {
    console.info("[email] SMTP is not configured; skipping delivery", { to: input.to, subject: input.subject });
    return false;
  }

  try {
    await emailTransport.transport.sendMail({
      from: emailTransport.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return true;
  } catch (error) {
    console.error("[email] Failed to send email message", {
      to: input.to,
      subject: input.subject,
      error,
    });
    return false;
  }
}
