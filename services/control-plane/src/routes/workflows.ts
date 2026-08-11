import { Router } from "express";
import { z } from "zod";
import { Prisma, prisma, WorkflowStatus } from "@worklane/db";
import { AuthenticatedRequest, requireAuth } from "../lib/auth";
import { sendZodError } from "../lib/http";

export const workflowRouter = Router();

workflowRouter.use(requireAuth);

const workflowStepSchema = z.object({
  stepProviderId: z.string().min(1),
  name: z.string().trim().min(1).optional(),
  config: z.record(z.unknown()).default({}),
});

const createWorkflowSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
  status: z.nativeEnum(WorkflowStatus).optional(),
  triggerProviderId: z.string().min(1),
  triggerConfig: z.record(z.unknown()).default({}),
  steps: z.array(workflowStepSchema).min(1),
});

workflowRouter.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const workflows = await prisma.workflow.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      include: {
        trigger: {
          include: { provider: true },
        },
        steps: {
          orderBy: { position: "asc" },
          include: { provider: true },
        },
        _count: {
          select: { executions: true },
        },
      },
    });

    res.json({ workflows });
  } catch (error) {
    next(error);
  }
});

workflowRouter.get("/:workflowId", async (req: AuthenticatedRequest, res, next) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.workflowId,
        userId: req.userId,
      },
      include: {
        trigger: {
          include: { provider: true },
        },
        steps: {
          orderBy: { position: "asc" },
          include: { provider: true },
        },
        executions: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!workflow) {
      res.status(404).json({ message: "Workflow not found" });
      return;
    }

    res.json({ workflow });
  } catch (error) {
    next(error);
  }
});

workflowRouter.get("/:workflowId/executions", async (req: AuthenticatedRequest, res, next) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.workflowId,
        userId: req.userId,
      },
      select: { id: true },
    });

    if (!workflow) {
      res.status(404).json({ message: "Workflow not found" });
      return;
    }

    const executions = await prisma.workflowExecution.findMany({
      where: { workflowId: workflow.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        steps: {
          orderBy: { position: "asc" },
          include: {
            workflowStep: {
              include: { provider: true },
            },
          },
        },
        outboxEvents: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    res.json({ executions });
  } catch (error) {
    next(error);
  }
});

workflowRouter.get(
  "/:workflowId/executions/:executionId",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const execution = await prisma.workflowExecution.findFirst({
        where: {
          id: req.params.executionId,
          workflowId: req.params.workflowId,
          workflow: {
            userId: req.userId,
          },
        },
        include: {
          workflow: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          steps: {
            orderBy: { position: "asc" },
            include: {
              workflowStep: {
                include: { provider: true },
              },
            },
          },
          outboxEvents: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!execution) {
        res.status(404).json({ message: "Execution not found" });
        return;
      }

      res.json({ execution });
    } catch (error) {
      next(error);
    }
  },
);

workflowRouter.post("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const parsed = createWorkflowSchema.safeParse(req.body);
    if (!parsed.success) {
      sendZodError(res, parsed.error);
      return;
    }

    const workflow = await prisma.$transaction(async (tx) => {
      const triggerProvider = await tx.triggerProvider.findUnique({
        where: { id: parsed.data.triggerProviderId },
      });

      if (!triggerProvider) {
        throw new ProviderError(`Unknown trigger provider: ${parsed.data.triggerProviderId}`);
      }

      const stepProviders = await tx.stepProvider.findMany({
        where: {
          id: {
            in: parsed.data.steps.map((step) => step.stepProviderId),
          },
        },
      });
      const knownStepProviderIds = new Set(stepProviders.map((provider) => provider.id));
      const missingStepProvider = parsed.data.steps.find(
        (step) => !knownStepProviderIds.has(step.stepProviderId),
      );

      if (missingStepProvider) {
        throw new ProviderError(`Unknown step provider: ${missingStepProvider.stepProviderId}`);
      }

      return tx.workflow.create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          status: parsed.data.status ?? WorkflowStatus.ACTIVE,
          userId: req.userId!,
          trigger: {
            create: {
              provider: {
                connect: { id: parsed.data.triggerProviderId },
              },
              config: parsed.data.triggerConfig as Prisma.InputJsonValue,
            },
          },
          steps: {
            create: parsed.data.steps.map((step, index) => ({
              provider: {
                connect: { id: step.stepProviderId },
              },
              name: step.name,
              config: step.config as Prisma.InputJsonValue,
              position: index,
            })),
          },
        },
        include: {
          trigger: {
            include: { provider: true },
          },
          steps: {
            orderBy: { position: "asc" },
            include: { provider: true },
          },
        },
      });
    });

    res.status(201).json({ workflow });
  } catch (error) {
    if (error instanceof ProviderError) {
      res.status(400).json({ message: error.message });
      return;
    }

    next(error);
  }
});

class ProviderError extends Error {}
