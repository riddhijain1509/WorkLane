import { createServer } from "node:http";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

type WorkerDefinition = {
  name: string;
  workspace: string;
};

const workers: WorkerDefinition[] = [
  { name: "dispatcher", workspace: "services/dispatcher" },
  { name: "executor", workspace: "services/executor" },
  { name: "scheduler", workspace: "services/scheduler" },
];

const port = Number(process.env.PORT ?? 4010);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const childProcesses: ChildProcessWithoutNullStreams[] = [];
let shuttingDown = false;

function startWorker(worker: WorkerDefinition) {
  const child = spawn(npmCommand, ["--workspace", worker.workspace, "run", "start"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "pipe",
  });

  childProcesses.push(child);

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[${worker.name}] ${chunk}`);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${worker.name}] ${chunk}`);
  });

  child.on("exit", (code, signal) => {
    console.error(`[${worker.name}] exited with code ${code ?? "null"} signal ${signal ?? "null"}`);

    if (!shuttingDown) {
      console.log(`[${worker.name}] restarting in 5 seconds`);
      setTimeout(() => startWorker(worker), 5000);
    }
  });
}

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        service: "worker-host",
        workers: workers.map((worker) => worker.name),
      }),
    );
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Not found" }));
});

server.listen(port, () => {
  console.log(`Worker host health server listening on port ${port}`);
  workers.forEach(startWorker);
});

function shutdown(signal: string) {
  console.log(`${signal} received. Stopping worker host.`);
  shuttingDown = true;

  for (const child of childProcesses) {
    child.kill("SIGTERM");
  }

  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
