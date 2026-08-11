export const CONTROL_PLANE_URL =
  process.env.NEXT_PUBLIC_CONTROL_PLANE_URL ?? "http://localhost:4000";

export const INGESTION_URL =
  process.env.NEXT_PUBLIC_INGESTION_URL ?? "http://localhost:4001";

export type Provider = {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
};

export type WorkflowStep = {
  id: string;
  name?: string;
  position: number;
  provider: Provider;
  config: Record<string, unknown>;
};

export type Workflow = {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  trigger?: {
    provider: Provider;
    config: Record<string, unknown>;
  };
  steps: WorkflowStep[];
  _count?: {
    executions: number;
  };
};

export type WorkflowExecution = {
  id: string;
  workflowId: string;
  status: string;
  triggerPayload: unknown;
  error?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  steps: {
    id: string;
    position: number;
    status: string;
    output: unknown;
    error?: string;
    workflowStep: WorkflowStep;
  }[];
};

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${CONTROL_PLANE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => undefined);
    throw new Error(errorBody?.message ?? `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
