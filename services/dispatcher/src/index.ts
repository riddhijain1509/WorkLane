import "dotenv/config";
import { Kafka } from "kafkajs";
import { OutboxStatus, prisma } from "@worklane/db";
import { config } from "./config";

const kafka = new Kafka({
  clientId: "worklane-dispatcher",
  brokers: config.kafkaBrokers,
});

const producer = kafka.producer();
let shuttingDown = false;

async function main() {
  await producer.connect();
  console.log(`Dispatcher connected to Kafka topic ${config.kafkaTopic}`);

  while (!shuttingDown) {
    await dispatchBatch();
    await sleep(config.pollIntervalMs);
  }

  await producer.disconnect();
  await prisma.$disconnect();
}

async function dispatchBatch() {
  const outboxEvents = await prisma.executionOutbox.findMany({
    where: { status: OutboxStatus.PENDING },
    orderBy: { createdAt: "asc" },
    take: config.batchSize,
    include: {
      execution: {
        select: {
          id: true,
          workflowId: true,
        },
      },
    },
  });

  if (outboxEvents.length === 0) {
    return;
  }

  console.log(`Dispatching ${outboxEvents.length} outbox event(s)`);

  for (const event of outboxEvents) {
    try {
      await producer.send({
        topic: config.kafkaTopic,
        messages: [
          {
            key: event.workflowExecutionId,
            value: JSON.stringify({
              outboxEventId: event.id,
              workflowExecutionId: event.workflowExecutionId,
              workflowId: event.execution.workflowId,
              stepPosition: event.stepPosition,
            }),
          },
        ],
      });

      await prisma.executionOutbox.update({
        where: { id: event.id },
        data: {
          status: OutboxStatus.DISPATCHED,
          attempts: { increment: 1 },
          dispatchedAt: new Date(),
          lastError: null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown dispatch error";
      console.error(`Failed to dispatch outbox event ${event.id}: ${message}`);

      await prisma.executionOutbox.update({
        where: { id: event.id },
        data: {
          attempts: { increment: 1 },
          lastError: message,
        },
      });
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestShutdown(signal: string) {
  console.log(`${signal} received. Stopping dispatcher after current batch.`);
  shuttingDown = true;
}

process.on("SIGINT", () => requestShutdown("SIGINT"));
process.on("SIGTERM", () => requestShutdown("SIGTERM"));

main().catch(async (error) => {
  console.error(error);
  await producer.disconnect().catch(() => undefined);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
