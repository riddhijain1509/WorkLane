import "dotenv/config";
import cors from "cors";
import express from "express";
import { prisma, WorkflowStatus } from "@worklane/db";

const app = express();
const port = Number(process.env.INGESTION_PORT ?? 4001);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ingestion" });
});

app.post("/webhooks/:workflowId", async (req, res, next) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.workflowId,
        status: WorkflowStatus.ACTIVE,
        trigger: {
          triggerProviderId: "webhook.received",
        },
      },
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
      res.status(404).json({ message: "Active webhook workflow not found" });
      return;
    }

    if (workflow.steps.length === 0) {
      res.status(400).json({ message: "Workflow has no steps to execute" });
      return;
    }

    const execution = await prisma.$transaction(async (tx) => {
      return tx.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          triggerPayload: req.body ?? {},
          steps: {
            create: workflow.steps.map((step) => ({
              workflowStepId: step.id,
              position: step.position,
              input: req.body ?? {},
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
    });

    res.status(202).json({
      message: "Webhook accepted",
      executionId: execution.id,
      queuedStepPosition: execution.outboxEvents[0]?.stepPosition ?? 0,
    });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ message: "Something went wrong" });
});

app.listen(port, () => {
  console.log(`Ingestion service listening on port ${port}`);
});
