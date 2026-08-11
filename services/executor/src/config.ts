export const config = {
  kafkaBrokers: (process.env.KAFKA_BROKERS ?? "localhost:9092")
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean),
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
