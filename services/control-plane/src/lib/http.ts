import { Response } from "express";
import { ZodError } from "zod";

export function sendZodError(res: Response, error: ZodError) {
  res.status(400).json({
    message: "Invalid request",
    issues: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
}
