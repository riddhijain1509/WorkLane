export function wakeWorkerHost() {
  const workerHostUrl = process.env.WORKER_HOST_URL;

  if (!workerHostUrl) {
    return;
  }

  const healthUrl = new URL("/health", workerHostUrl).toString();

  fetch(healthUrl).catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown worker wake error";
    console.warn(`Unable to wake worker host: ${message}`);
  });
}
