import { renderTemplate } from "../template";

type LogMessageConfig = {
  message?: string;
};

export async function runLogMessageStep(config: LogMessageConfig, payload: unknown) {
  const message = renderTemplate(config.message ?? "Workflow step executed", payload);
  console.log(`[log.message] ${message}`);

  return {
    message,
  };
}
