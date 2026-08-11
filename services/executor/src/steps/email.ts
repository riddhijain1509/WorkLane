import nodemailer from "nodemailer";
import { config as appConfig } from "../config";
import { renderTemplate } from "../template";

type EmailConfig = {
  to?: string;
  subject?: string;
  body?: string;
};

type ResolvedEmailConfig = EmailConfig & {
  to: string;
};

export async function runEmailSendStep(config: EmailConfig, payload: unknown) {
  if (!config.to) {
    throw new Error("email.send requires config.to");
  }

  const resolvedConfig: ResolvedEmailConfig = {
    ...config,
    to: config.to,
  };

  if (appConfig.resend.apiKey) {
    return sendWithResend(resolvedConfig, payload);
  }

  return sendWithSmtp(resolvedConfig, payload);
}

async function sendWithSmtp(config: ResolvedEmailConfig, payload: unknown) {
  if (!appConfig.smtp.host || !appConfig.smtp.user || !appConfig.smtp.pass) {
    throw new Error("Email provider is not configured. Set RESEND_API_KEY or SMTP credentials.");
  }

  const transporter = nodemailer.createTransport({
    host: appConfig.smtp.host,
    port: appConfig.smtp.port,
    secure: appConfig.smtp.secure || appConfig.smtp.port === 465,
    connectionTimeout: appConfig.smtp.timeoutMs,
    greetingTimeout: appConfig.smtp.timeoutMs,
    socketTimeout: appConfig.smtp.timeoutMs,
    auth: {
      user: appConfig.smtp.user,
      pass: appConfig.smtp.pass,
    },
  });

  const to = renderTemplate(config.to, payload);
  const subject = renderTemplate(config.subject ?? "WorkLane notification", payload);
  const text = renderTemplate(config.body ?? "", payload);

  const result = await transporter.sendMail({
    from: appConfig.smtp.from,
    to,
    subject,
    text,
  });

  return {
    provider: "smtp",
    to,
    subject,
    messageId: result.messageId,
  };
}

async function sendWithResend(config: ResolvedEmailConfig, payload: unknown) {
  const to = renderTemplate(config.to, payload);
  const subject = renderTemplate(config.subject ?? "WorkLane notification", payload);
  const text = renderTemplate(config.body ?? "", payload);
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), appConfig.resend.timeoutMs);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: abortController.signal,
      headers: {
        Authorization: `Bearer ${appConfig.resend.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: appConfig.resend.from,
        to,
        subject,
        text,
      }),
    });

    const responseBody = (await response.json().catch(() => undefined)) as
      | { id?: string; message?: string; error?: { message?: string } }
      | undefined;

    if (!response.ok) {
      throw new Error(
        responseBody?.message ??
          responseBody?.error?.message ??
          `Resend API returned ${response.status}`,
      );
    }

    return {
      provider: "resend",
      to,
      subject,
      messageId: responseBody?.id,
    };
  } finally {
    clearTimeout(timeout);
  }
}
