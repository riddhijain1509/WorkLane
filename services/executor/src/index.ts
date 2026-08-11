import "dotenv/config";
import { Kafka } from "kafkajs";
import {
  ExecutionStatus,
  OutboxStatus,
  Prisma,
  prisma,
  StepExecutionStatus,
} from "@worklane/db";
import { config } from "./config";
import { runStep } from "./steps";

type WorkflowEventMessage = {
  workflowExecutionId: string;
  workflowId: string;
  stepPosition: number;
};

const kafka = new Kafka({
  clientId: "worklane-executor",
  brokers: config.kafkaBrokers,
});

const consumer = kafka.consumer({ groupId: config.kafkaGroupId });

async function main() {
  await consumer.connect();
  await consumer.subscribe({ topic: config.kafkaTopic, fromBeginning: false });

  console.log(`Executor subscribed to Kafka topic ${config.kafkaTopic}`);

  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      const rawValue = message.value?.toString();

      try {
        if (!rawValue) {
          throw new Error("Kafka message is empty");
        }

        const parsed = JSON.parse(rawValue) as WorkflowEventMessage;
        await executeWorkflowStep(parsed);

        await consumer.commitOffsets([
          {
            topic,
            partition,
            offset: (Number(message.offset) + 1).toString(),
          },
        ]);
      } catch (error) {
        console.error(error);
      }
    },
  });
}

async function executeWorkflowStep(event: WorkflowEventMessage) {
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: event.workflowExecutionId },
    include: {
      workflow: {
        include: {
          steps: {
            orderBy: { position: "asc" },
            include: { provider: true },
          },
        },
      },
      steps: true,
    },
  });

  if (!execution) {
    throw new Error(`Workflow execution not found: ${event.workflowExecutionId}`);
  }

  const workflowStep = execution.workflow.steps.find(
    (step) => step.position === event.stepPosition,
  );

  const executionStep = execution.steps.find((step) => step.position === event.stepPosition);

  if (!workflowStep || !executionStep) {
    throw new Error(
      `Step position ${event.stepPosition} not found for execution ${event.workflowExecutionId}`,
    );
  }

  await prisma.workflowExecution.update({
    where: { id: execution.id },
    data: {
      status: ExecutionStatus.RUNNING,
      startedAt: execution.startedAt ?? new Date(),
    },
  });

  await prisma.executionStep.update({
    where: { id: executionStep.id },
    data: {
      status: StepExecutionStatus.RUNNING,
      startedAt: new Date(),
    },
  });

  try {
    const output = await runStep(
      workflowStep.provider.id,
      workflowStep.config,
      execution.triggerPayload,
    );

    const nextStep = execution.workflow.steps.find(
      (step) => step.position === event.stepPosition + 1,
    );

    await prisma.$transaction(async (tx) => {
      await tx.executionStep.update({
        where: { id: executionStep.id },
        data: {
          status: StepExecutionStatus.SUCCEEDED,
          output: output as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });

      if (nextStep) {
        await tx.executionOutbox.create({
          data: {
            workflowExecutionId: execution.id,
            stepPosition: nextStep.position,
            status: OutboxStatus.PENDING,
          },
        });
      } else {
        await tx.workflowExecution.update({
          where: { id: execution.id },
          data: {
            status: ExecutionStatus.SUCCEEDED,
            finishedAt: new Date(),
          },
        });
      }
    });

    console.log(
      `Executed ${workflowStep.provider.id} for execution ${execution.id} at position ${event.stepPosition}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown execution error";

    await prisma.$transaction([
      prisma.executionStep.update({
        where: { id: executionStep.id },
        data: {
          status: StepExecutionStatus.FAILED,
          error: message,
          finishedAt: new Date(),
        },
      }),
      prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.FAILED,
          error: message,
          finishedAt: new Date(),
        },
      }),
    ]);

    throw error;
  }
}

process.on("SIGINT", async () => {
  await consumer.disconnect();
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await consumer.disconnect();
  await prisma.$disconnect();
  process.exit(0);
});

main().catch(async (error) => {
  console.error(error);
  await consumer.disconnect().catch(() => undefined);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
