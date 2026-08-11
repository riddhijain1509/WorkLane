import { runEmailSendStep } from "./email";
import { runHttpRequestStep } from "./http";
import { runLogMessageStep } from "./log";

export async function runStep(providerId: string, config: unknown, payload: unknown) {
  const stepConfig = config && typeof config === "object" ? config : {};

  switch (providerId) {
    case "log.message":
      return runLogMessageStep(stepConfig, payload);
    case "email.send":
      return runEmailSendStep(stepConfig, payload);
    case "http.request":
      return runHttpRequestStep(stepConfig, payload);
    default:
      throw new Error(`Unsupported step provider: ${providerId}`);
  }
}
