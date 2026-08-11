"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Clock, GitBranch, Plus, Radio } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { redirectToSignInIfNeeded } from "@/lib/auth-redirect";
import { INGESTION_URL, Workflow, apiFetch, getWorkflowTriggerProviderId } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ workflows: Workflow[] }>("/api/workflows")
      .then((data) => setWorkflows(data.workflows))
      .catch((caught) => {
        if (redirectToSignInIfNeeded(caught, router)) {
          return;
        }

        setError(caught instanceof Error ? caught.message : "Unable to load workflows");
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <p className="eyebrow">Control center</p>
          <h1>Workflows</h1>
          <p className="muted">Create webhook-driven automations and monitor recent runs.</p>
        </div>
        <Link className="btn" href="/workflows/new">
          <Plus size={17} />
          New workflow
        </Link>
      </div>

      {error && <div className="error">{error}</div>}
      {loading && <div className="panel">Loading workflows...</div>}

      {!loading && workflows.length === 0 && (
        <section className="panel">
          <h2>No workflows yet</h2>
          <p className="muted">Create your first workflow and send a webhook to start an execution.</p>
          <Link className="btn" href="/workflows/new">
            Create workflow
          </Link>
        </section>
      )}

      <div className="stack">
        {workflows.map((workflow) => {
          const triggerProviderId = getWorkflowTriggerProviderId(workflow);
          const isManual = triggerProviderId === "manual.run";

          return (
            <article className="card workflow-card" key={workflow.id}>
              <div className="card-row">
                <div>
                  <h3>{workflow.name}</h3>
                  <p className="muted">{workflow.description || "No description"}</p>
                </div>
                <span className={`status ${workflow.status}`}>{workflow.status}</span>
              </div>
              <div className="grid workflow-stats" style={{ marginTop: 14 }}>
                <div>
                  <p className="muted">
                    <Radio size={14} /> Trigger
                  </p>
                  <strong>{workflow.trigger?.provider.name ?? "Webhook"}</strong>
                </div>
                <div>
                  <p className="muted">
                    <GitBranch size={14} /> Steps
                  </p>
                  <strong>{workflow.steps.length}</strong>
                </div>
                <div>
                  <p className="muted">
                    <Clock size={14} /> Runs
                  </p>
                  <strong>{workflow._count?.executions ?? 0}</strong>
                </div>
              </div>
              {isManual ? (
                <div className="code" style={{ marginTop: 14 }}>
                  Runs from the workflow detail page
                </div>
              ) : (
                <div className="code" style={{ marginTop: 14 }}>
                  {INGESTION_URL}/webhooks/{workflow.id}
                </div>
              )}
              <div className="nav" style={{ marginTop: 14 }}>
                <Link className="btn secondary" href={`/workflows/${workflow.id}`}>
                  View details
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
