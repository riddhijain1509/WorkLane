import nodemailer from "nodemailer";
import { config as appConfig } from "../config";
import { renderTemplate } from "../template";

type EmailConfig = {
  to?: string;
  subject?: string;
  body?: string;
};

export async function runEmailSendStep(config: EmailConfig, payload: unknown) {
  if (!appConfig.smtp.host || !appConfig.smtp.user || !appConfig.smtp.pass) {
    throw new Error("SMTP credentials are not configured");
  }

  if (!config.to) {
    throw new Error("email.send requires config.to");
  }

  const transporter = nodemailer.createTransport({
    host: appConfig.smtp.host,
    port: appConfig.smtp.port,
    secure: appConfig.smtp.port === 465,
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
    to,
    subject,
    messageId: result.messageId,
  };
}
