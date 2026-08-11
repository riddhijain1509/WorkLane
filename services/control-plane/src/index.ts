import "./lib/load-env";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth";
import { providerRouter } from "./routes/providers";
import { workflowRouter } from "./routes/workflows";

const app = express();
const port = Number(process.env.PORT ?? process.env.CONTROL_PLANE_PORT ?? 4000);

app.use(
  cors({
    origin: process.env.DASHBOARD_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "control-plane" });
});

app.use("/api/auth", authRouter);
app.use("/api/providers", providerRouter);
app.use("/api/workflows", workflowRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ message: "Something went wrong" });
});

app.listen(port, () => {
  console.log(`Control plane API listening on port ${port}`);
});
