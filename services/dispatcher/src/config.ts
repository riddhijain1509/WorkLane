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
  pollIntervalMs: Number(process.env.DISPATCHER_POLL_INTERVAL_MS ?? 3000),
  batchSize: Number(process.env.DISPATCHER_BATCH_SIZE ?? 10),
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
