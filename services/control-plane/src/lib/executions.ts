import { Prisma, prisma } from "@worklane/db";

type QueueWorkflowExecutionParams = {
  workflowId: string;
  triggerPayload: Prisma.InputJsonValue;
};

export async function queueWorkflowExecution({
  workflowId,
  triggerPayload,
}: QueueWorkflowExecutionParams) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    include: {
      steps: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          position: true,
        },
      },
    },
  });

  if (!workflow) {
    throw new QueueExecutionError("Workflow not found");
  }

  if (workflow.steps.length === 0) {
    throw new QueueExecutionError("Workflow has no steps to execute");
  }

  return prisma.workflowExecution.create({
    data: {
      workflowId: workflow.id,
      triggerPayload,
      steps: {
        create: workflow.steps.map((step) => ({
          workflowStepId: step.id,
          position: step.position,
          input: triggerPayload,
        })),
      },
      outboxEvents: {
        create: {
          stepPosition: workflow.steps[0].position,
        },
      },
    },
    include: {
      steps: {
        orderBy: { position: "asc" },
      },
      outboxEvents: true,
    },
  });
}

export class QueueExecutionError extends Error {}
