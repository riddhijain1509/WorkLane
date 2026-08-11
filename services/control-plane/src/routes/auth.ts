import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "@worklane/db";
import {
  AuthenticatedRequest,
  clearSessionCookie,
  createSessionToken,
  requireAuth,
  setSessionCookie,
} from "../lib/auth";
import { sendZodError } from "../lib/http";

export const authRouter = Router();

const signupSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

authRouter.post("/signup", async (req, res, next) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      sendZodError(res, parsed.error);
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existingUser) {
      res.status(409).json({ message: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    setSessionCookie(res, createSessionToken(user.id));
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      sendZodError(res, parsed.error);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!passwordMatches) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    setSessionCookie(res, createSessionToken(user.id));
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(204).send();
});

authRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});
