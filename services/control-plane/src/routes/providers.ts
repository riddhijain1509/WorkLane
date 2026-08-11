import { Router } from "express";
import { prisma } from "@worklane/db";
import { requireAuth } from "../lib/auth";

export const providerRouter = Router();

providerRouter.use(requireAuth);

providerRouter.get("/triggers", async (_req, res, next) => {
  try {
    const triggers = await prisma.triggerProvider.findMany({
      orderBy: { name: "asc" },
    });

    res.json({ triggers });
  } catch (error) {
    next(error);
  }
});

providerRouter.get("/steps", async (_req, res, next) => {
  try {
    const steps = await prisma.stepProvider.findMany({
      orderBy: { name: "asc" },
    });

    res.json({ steps });
  } catch (error) {
    next(error);
  }
});
