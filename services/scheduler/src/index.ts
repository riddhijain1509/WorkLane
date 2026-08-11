import "./load-env";
import { Prisma, WorkflowStatus, prisma } from "@worklane/db";

const pollIntervalMs = Number(process.env.SCHEDULER_POLL_INTERVAL_MS ?? 5000);
let shuttingDown = false;

async function main() {
  console.log(`Scheduler polling every ${pollIntervalMs}ms`);

  while (!shuttingDown) {
    await queueDueScheduledWorkflows();
    await sleep(pollIntervalMs);
  }

  await prisma.$disconnect();
}

async function queueDueScheduledWorkflows() {
  const workflows = await prisma.workflow.findMany({
    where: {
      status: WorkflowStatus.ACTIVE,
      trigger: {
        triggerProviderId: "schedule.interval",
      },
    },
    include: {
      trigger: true,
      steps: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          position: true,
        },
      },
      executions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          createdAt: true,
        },
      },
    },
  });

  const now = new Date();

  for (const workflow of workflows) {
    if (workflow.steps.length === 0) {
      continue;
    }

    const intervalSeconds = readIntervalSeconds(workflow.trigger?.config);
    const lastExecution = workflow.executions[0];
    const isDue =
      !lastExecution ||
      now.getTime() - lastExecution.createdAt.getTime() >= intervalSeconds * 1000;

    if (!isDue) {
      continue;
    }

    await prisma.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        triggerPayload: {
          schedule: {
            triggeredAt: now.toISOString(),
            intervalSeconds,
          },
          event: {
            name: "Scheduled run",
            source: "scheduler",
          },
        },
        steps: {
          create: workflow.steps.map((step) => ({
            workflowStepId: step.id,
            position: step.position,
            input: {
              schedule: {
                triggeredAt: now.toISOString(),
                intervalSeconds,
              },
            },
          })),
        },
        outboxEvents: {
          create: {
            stepPosition: workflow.steps[0].position,
          },
        },
      },
    });

    console.log(`Queued scheduled workflow ${workflow.id}`);
  }
}

function readIntervalSeconds(config: Prisma.JsonValue | undefined) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return 60;
  }

  const value = (config as Record<string, unknown>).intervalSeconds;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 10) {
    return 60;
  }

  return Math.floor(value);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestShutdown(signal: string) {
  console.log(`${signal} received. Stopping scheduler after current poll.`);
  shuttingDown = true;
}

process.on("SIGINT", () => requestShutdown("SIGINT"));
process.on("SIGTERM", () => requestShutdown("SIGTERM"));

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
