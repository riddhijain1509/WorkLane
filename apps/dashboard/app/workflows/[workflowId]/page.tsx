"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Copy, RefreshCw, Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { redirectToSignInIfNeeded } from "@/lib/auth-redirect";
import { INGESTION_URL, Workflow, WorkflowExecution, apiFetch } from "@/lib/api";

export default function WorkflowDetailPage() {
  const router = useRouter();
  const params = useParams<{ workflowId: string }>();
  const workflowId = params.workflowId;
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [testPayload, setTestPayload] = useState('{\n  "event": {\n    "name": "Riddhi",\n    "source": "dashboard"\n  }\n}');
  const [error, setError] = useState("");

  const webhookUrl = useMemo(() => `${INGESTION_URL}/webhooks/${workflowId}`, [workflowId]);

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
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: testPayload,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => undefined);
        throw new Error(body?.message ?? "Webhook failed");
      }

      setTimeout(load, 800);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send webhook");
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
        <button className="btn secondary" onClick={load}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="two-col">
        <section className="panel stack">
          <div className="card-row">
            <h2>Webhook</h2>
            <button className="btn secondary" onClick={() => navigator.clipboard.writeText(webhookUrl)}>
              <Copy size={16} />
              Copy
            </button>
          </div>
          <div className="code">{webhookUrl}</div>

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

          <h2>Test payload</h2>
          <textarea
            className="textarea"
            value={testPayload}
            onChange={(event) => setTestPayload(event.target.value)}
          />
          <button className="btn" onClick={sendTestWebhook}>
            <Send size={16} />
            Send test webhook
          </button>
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
