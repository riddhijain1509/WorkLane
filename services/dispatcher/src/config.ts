export const config = {
  kafkaBrokers: (process.env.KAFKA_BROKERS ?? "localhost:9092")
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean),
  kafkaTopic: process.env.KAFKA_TOPIC ?? "workflow-events",
  pollIntervalMs: Number(process.env.DISPATCHER_POLL_INTERVAL_MS ?? 3000),
  batchSize: Number(process.env.DISPATCHER_BATCH_SIZE ?? 10),
};
