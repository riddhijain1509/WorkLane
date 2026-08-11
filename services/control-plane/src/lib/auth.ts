import { CookieOptions, NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export type AuthenticatedRequest = Request & {
  userId?: string;
};

const cookieName = "worklane_session";

export function createSessionToken(userId: string) {
  return jwt.sign({ sub: userId }, getJwtSecret(), {
    expiresIn: "30d",
  });
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(cookieName, token, {
    ...sessionCookieOptions(),
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(cookieName, sessionCookieOptions());
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[cookieName];

  if (!token) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    if (!decoded.sub || typeof decoded.sub !== "string") {
      res.status(401).json({ message: "Invalid session" });
      return;
    }

    req.userId = decoded.sub;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired session" });
  }
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }

  return secret;
}

function sessionCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    path: "/",
  };
}
