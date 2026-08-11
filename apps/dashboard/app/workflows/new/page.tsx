"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { redirectToSignInIfNeeded } from "@/lib/auth-redirect";
import { Provider, apiFetch } from "@/lib/api";

type StepDraft = {
  stepProviderId: string;
  name: string;
  configText: string;
};

export default function NewWorkflowPage() {
  const router = useRouter();
  const [triggers, setTriggers] = useState<Provider[]>([]);
  const [steps, setSteps] = useState<Provider[]>([]);
  const [name, setName] = useState("Webhook to log");
  const [description, setDescription] = useState("Records incoming webhook payloads in executor logs.");
  const [triggerProviderId, setTriggerProviderId] = useState("webhook.received");
  const [stepDrafts, setStepDrafts] = useState<StepDraft[]>([
    {
      stepProviderId: "log.message",
      name: "Log incoming event",
      configText: '{\n  "message": "Received payload for {{event.name}}"\n}',
    },
  ]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<{ triggers: Provider[] }>("/api/providers/triggers"),
      apiFetch<{ steps: Provider[] }>("/api/providers/steps"),
    ])
      .then(([triggerData, stepData]) => {
        setTriggers(triggerData.triggers);
        setSteps(stepData.steps);
      })
      .catch((caught) => {
        if (redirectToSignInIfNeeded(caught, router)) {
          return;
        }

        setError(caught instanceof Error ? caught.message : "Unable to load providers");
      });
  }, [router]);

  function updateStep(index: number, patch: Partial<StepDraft>) {
    setStepDrafts((current) =>
      current.map((step, stepIndex) => (stepIndex === index ? { ...step, ...patch } : step)),
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const parsedSteps = stepDrafts.map((step) => ({
        stepProviderId: step.stepProviderId,
        name: step.name,
        config: JSON.parse(step.configText) as Record<string, unknown>,
      }));

      const response = await apiFetch<{ workflow: { id: string } }>("/api/workflows", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          triggerProviderId,
          triggerConfig: {},
          steps: parsedSteps,
        }),
      });

      router.push(`/workflows/${response.workflow.id}`);
    } catch (caught) {
      if (redirectToSignInIfNeeded(caught, router)) {
        return;
      }

      setError(caught instanceof Error ? caught.message : "Unable to create workflow");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <p className="eyebrow">Builder</p>
          <h1>New workflow</h1>
          <p className="muted">Start with a webhook trigger and add provider-backed steps.</p>
        </div>
      </div>

      <form className="two-col" onSubmit={submit}>
        <section className="panel stack">
          <div className="field">
            <label>Workflow name</label>
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="field">
            <label>Description</label>
            <input
              className="input"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="field">
            <label>Trigger</label>
            <select
              className="select"
              value={triggerProviderId}
              onChange={(event) => setTriggerProviderId(event.target.value)}
            >
              {triggers.map((trigger) => (
                <option key={trigger.id} value={trigger.id}>
                  {trigger.name}
                </option>
              ))}
            </select>
          </div>
          <h2>Steps</h2>
          <div className="steps">
            {stepDrafts.map((step, index) => (
              <div className="card" key={index}>
                <div className="card-row">
                  <strong>Step {index + 1}</strong>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => setStepDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    disabled={stepDrafts.length === 1}
                    title="Remove step"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="stack" style={{ marginTop: 12 }}>
                  <div className="field">
                    <label>Provider</label>
                    <select
                      className="select"
                      value={step.stepProviderId}
                      onChange={(event) => updateStep(index, { stepProviderId: event.target.value })}
                    >
                      {steps.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Step name</label>
                    <input
                      className="input"
                      value={step.name}
                      onChange={(event) => updateStep(index, { name: event.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Config JSON</label>
                    <textarea
                      className="textarea"
                      value={step.configText}
                      onChange={(event) => updateStep(index, { configText: event.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            className="btn secondary"
            type="button"
            onClick={() =>
              setStepDrafts((current) => [
                ...current,
                {
                  stepProviderId: "log.message",
                  name: "Next step",
                  configText: '{\n  "message": "Next step for {{event.name}}"\n}',
                },
              ])
            }
          >
            <Plus size={16} />
            Add step
          </button>
          {error && <div className="error">{error}</div>}
          <button className="btn" disabled={saving}>
            {saving ? "Creating..." : "Create workflow"}
          </button>
        </section>

        <aside className="panel">
          <h2>Config examples</h2>
          <div className="stack">
            <div>
              <h3>Log message</h3>
              <div className="code">{'{ "message": "Received {{event.name}}" }'}</div>
            </div>
            <div>
              <h3>Email</h3>
              <div className="code">
                {'{ "to": "you@example.com", "subject": "New event", "body": "Hi {{event.name}}" }'}
              </div>
            </div>
            <div>
              <h3>HTTP request</h3>
              <div className="code">{'{ "url": "https://example.com", "method": "POST" }'}</div>
            </div>
          </div>
        </aside>
      </form>
    </AppShell>
  );
}
