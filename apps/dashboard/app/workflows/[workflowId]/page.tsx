"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Copy, Play, RefreshCw, Send, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { redirectToSignInIfNeeded } from "@/lib/auth-redirect";
import {
  INGESTION_URL,
  Workflow,
  WorkflowExecution,
  apiFetch,
  getWorkflowTriggerProviderId,
} from "@/lib/api";

export default function WorkflowDetailPage() {
  const router = useRouter();
  const params = useParams<{ workflowId: string }>();
  const workflowId = params.workflowId;
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [testPayload, setTestPayload] = useState('{\n  "event": {\n    "name": "Riddhi",\n    "source": "dashboard"\n  }\n}');
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const webhookUrl = useMemo(() => `${INGESTION_URL}/webhooks/${workflowId}`, [workflowId]);
  const triggerProviderId = getWorkflowTriggerProviderId(workflow);

  async function load() {
    setError("");
    try {
      const [workflowData, executionData] = await Promise.all([
        apiFetch<{ workflow: Workflow }>(`/api/workflows/${workflowId}`),
        apiFetch<{ executions: WorkflowExecution[] }>(`/api/workflows/${workflowId}/executions`),
      ]);
      setWorkflow(workflowData.workflow);
      setExecutions(executionData.executions);
    } catch (caught) {
      if (redirectToSignInIfNeeded(caught, router)) {
        return;
      }

      setError(caught instanceof Error ? caught.message : "Unable to load workflow");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function sendTestWebhook() {
    setError("");
    try {
      if (triggerProviderId === "manual.run") {
        await apiFetch(`/api/workflows/${workflowId}/manual-runs`, {
          method: "POST",
          body: JSON.stringify({
            payload: JSON.parse(testPayload),
          }),
        });
      } else {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: testPayload,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => undefined);
          throw new Error(body?.message ?? "Webhook failed");
        }
      }

      setTimeout(load, 800);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send webhook");
    }
  }

  async function deleteWorkflow() {
    const confirmed = window.confirm(
      `Delete "${workflow?.name ?? "this workflow"}"? This also removes its execution history.`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setDeleting(true);

    try {
      await apiFetch(`/api/workflows/${workflowId}`, {
        method: "DELETE",
      });
      router.push("/dashboard");
    } catch (caught) {
      if (redirectToSignInIfNeeded(caught, router)) {
        return;
      }

      setError(caught instanceof Error ? caught.message : "Unable to delete workflow");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <p className="eyebrow">Workflow detail</p>
          <h1>{workflow?.name ?? "Loading workflow..."}</h1>
          <p className="muted">{workflow?.description}</p>
        </div>
        <div className="nav">
          <button className="btn secondary" onClick={load}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn danger" onClick={deleteWorkflow} disabled={deleting || !workflow}>
            <Trash2 size={16} />
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="two-col">
        <section className="panel stack">
          {triggerProviderId === "manual.run" ? (
            <>
              <h2>Manual trigger</h2>
              <p className="muted">Start this workflow from WorkLane using the payload below.</p>
            </>
          ) : triggerProviderId === "schedule.interval" ? (
            <>
              <h2>Schedule trigger</h2>
              <p className="muted">
                This workflow runs every {String(workflow?.trigger?.config?.intervalSeconds ?? 60)} seconds while
                the scheduler service is running.
              </p>
            </>
          ) : (
            <>
              <div className="card-row">
                <h2>Webhook</h2>
                <button className="btn secondary" onClick={() => navigator.clipboard.writeText(webhookUrl)}>
                  <Copy size={16} />
                  Copy
                </button>
              </div>
              <div className="code">{webhookUrl}</div>
            </>
          )}

          <h2>Steps</h2>
          <div className="steps">
            {workflow?.steps.map((step) => (
              <div className="step-line" key={step.id}>
                <span className="step-index">{step.position + 1}</span>
                <div>
                  <strong>{step.name || step.provider.name}</strong>
                  <p className="muted" style={{ marginBottom: 0 }}>
                    {step.provider.id}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {triggerProviderId !== "schedule.interval" && (
            <>
              <h2>{triggerProviderId === "manual.run" ? "Run payload" : "Test payload"}</h2>
              <textarea
                className="textarea"
                value={testPayload}
                onChange={(event) => setTestPayload(event.target.value)}
              />
              <button className="btn" onClick={sendTestWebhook}>
                {triggerProviderId === "manual.run" ? <Play size={16} /> : <Send size={16} />}
                {triggerProviderId === "manual.run" ? "Run workflow" : "Send test webhook"}
              </button>
            </>
          )}
        </section>

        <section className="panel">
          <div className="card-row">
            <h2>Execution history</h2>
            <span className="muted">{executions.length} runs</span>
          </div>
          <div className="stack">
            {executions.length === 0 && <p className="muted">No runs yet.</p>}
            {executions.map((execution) => (
              <article className="card" key={execution.id}>
                <div className="card-row">
                  <strong>{new Date(execution.createdAt).toLocaleString()}</strong>
                  <span className={`status ${execution.status}`}>{execution.status}</span>
                </div>
                <div className="steps" style={{ marginTop: 12 }}>
                  {execution.steps.map((step) => (
                    <div className="step-line" key={step.id}>
                      <span className="step-index">{step.position + 1}</span>
                      <div>
                        <strong>{step.workflowStep.name || step.workflowStep.provider.name}</strong>
                        <p className="muted" style={{ marginBottom: 0 }}>
                          {step.status}
                          {step.error ? `: ${step.error}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
