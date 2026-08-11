import type { KafkaConfig, SASLOptions } from "kafkajs";
import type { ConnectionOptions } from "node:tls";

function buildKafkaSasl(): SASLOptions | undefined {
  const username = process.env.KAFKA_USERNAME;
  const password = process.env.KAFKA_PASSWORD;

  if (!username || !password) {
    return undefined;
  }

  switch (process.env.KAFKA_SASL_MECHANISM) {
    case "scram-sha-256":
      return { mechanism: "scram-sha-256", username, password };
    case "scram-sha-512":
      return { mechanism: "scram-sha-512", username, password };
    default:
      return { mechanism: "plain", username, password };
  }
}

export const config = {
  kafkaBrokers: (process.env.KAFKA_BROKERS ?? "localhost:9092")
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean),
  kafkaSsl: buildKafkaSsl(),
  kafkaSasl: buildKafkaSasl(),
  kafkaTopic: process.env.KAFKA_TOPIC ?? "workflow-events",
  kafkaGroupId: process.env.EXECUTOR_GROUP_ID ?? "worklane-executor",
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? "WorkLane <no-reply@worklane.local>",
  },
};

function buildKafkaSsl(): boolean | ConnectionOptions {
  if (process.env.KAFKA_SSL !== "true") {
    return false;
  }

  const ca = process.env.KAFKA_CA_CERT?.replace(/\\n/g, "\n");
  if (!ca) {
    return true;
  }

  return {
    ca: [ca],
    rejectUnauthorized: true,
  };
}

export function kafkaClientConfig(clientId: string): KafkaConfig {
  return {
    clientId,
    brokers: config.kafkaBrokers,
    ssl: config.kafkaSsl,
    ...(config.kafkaSasl ? { sasl: config.kafkaSasl } : {}),
  };
}
