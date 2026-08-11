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
  config: {
    message?: string;
    to?: string;
    subject?: string;
    body?: string;
    url?: string;
    method?: string;
    headers?: string;
  };
};

export default function NewWorkflowPage() {
  const router = useRouter();
  const [triggers, setTriggers] = useState<Provider[]>([]);
  const [steps, setSteps] = useState<Provider[]>([]);
  const [name, setName] = useState("Webhook to log");
  const [description, setDescription] = useState("Records incoming webhook payloads in executor logs.");
  const [triggerProviderId, setTriggerProviderId] = useState("webhook.received");
  const [intervalSeconds, setIntervalSeconds] = useState(60);
  const [stepDrafts, setStepDrafts] = useState<StepDraft[]>([
    {
      stepProviderId: "log.message",
      name: "Log incoming event",
      config: {
        message: "Received payload for {{event.name}}",
      },
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
        config: buildStepConfig(step),
      }));

      const response = await apiFetch<{ workflow: { id: string } }>("/api/workflows", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          triggerProviderId,
          triggerConfig:
            triggerProviderId === "schedule.interval"
              ? {
                  intervalSeconds,
                }
              : {},
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
              onChange={(event) => {
                const nextTriggerProviderId = event.target.value;
                setTriggerProviderId(nextTriggerProviderId);

                if (nextTriggerProviderId === "manual.run") {
                  setName("Manual workflow");
                  setDescription("Runs when started from the WorkLane dashboard.");
                }

                if (nextTriggerProviderId === "schedule.interval") {
                  setName("Scheduled workflow");
                  setDescription("Runs automatically on a fixed interval.");
                }
              }}
            >
              {triggers.map((trigger) => (
                <option key={trigger.id} value={trigger.id}>
                  {trigger.name}
                </option>
              ))}
            </select>
          </div>
          {triggerProviderId === "schedule.interval" && (
            <div className="field">
              <label>Run every</label>
              <input
                className="input"
                type="number"
                min={10}
                step={5}
                value={intervalSeconds}
                onChange={(event) => setIntervalSeconds(Number(event.target.value))}
              />
              <p className="muted" style={{ marginBottom: 0 }}>
                Seconds between scheduled runs. Minimum is 10 seconds.
              </p>
            </div>
          )}
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
                      onChange={(event) => {
                        const stepProviderId = event.target.value;
                        updateStep(index, {
                          stepProviderId,
                          name: defaultStepName(stepProviderId),
                          config: defaultStepConfig(stepProviderId),
                        });
                      }}
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
                  <StepConfigFields
                    step={step}
                    onChange={(config) =>
                      updateStep(index, {
                        config: {
                          ...step.config,
                          ...config,
                        },
                      })
                    }
                  />
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
                  name: "Log message",
                  config: defaultStepConfig("log.message"),
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
          <h2>Template data</h2>
          <div className="stack">
            <p className="muted">
              Step fields can use values from the incoming webhook payload.
            </p>
            <div className="code">{"{{event.name}}"}</div>
            <div className="code">{"{{event.source}}"}</div>
            <div className="code">{"{{schedule.triggeredAt}}"}</div>
            <p className="muted">
              Webhook and manual runs use `event`. Scheduled runs also include `schedule`.
            </p>
          </div>
        </aside>
      </form>
    </AppShell>
  );
}

function StepConfigFields({
  step,
  onChange,
}: {
  step: StepDraft;
  onChange: (config: Partial<StepDraft["config"]>) => void;
}) {
  if (step.stepProviderId === "email.send") {
    return (
      <>
        <div className="field">
          <label>Send to</label>
          <input
            className="input"
            type="email"
            placeholder="you@example.com"
            value={step.config.to ?? ""}
            onChange={(event) => onChange({ to: event.target.value })}
            required
          />
        </div>
        <div className="field">
          <label>Subject</label>
          <input
            className="input"
            value={step.config.subject ?? ""}
            onChange={(event) => onChange({ subject: event.target.value })}
          />
        </div>
        <div className="field">
          <label>Email body</label>
          <textarea
            className="textarea"
            value={step.config.body ?? ""}
            onChange={(event) => onChange({ body: event.target.value })}
          />
        </div>
      </>
    );
  }

  if (step.stepProviderId === "http.request") {
    return (
      <>
        <div className="field">
          <label>Request URL</label>
          <input
            className="input"
            type="url"
            placeholder="https://httpbin.org/post"
            value={step.config.url ?? ""}
            onChange={(event) => onChange({ url: event.target.value })}
            required
          />
        </div>
        <div className="field">
          <label>Method</label>
          <select
            className="select"
            value={step.config.method ?? "POST"}
            onChange={(event) => onChange({ method: event.target.value })}
          >
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="GET">GET</option>
          </select>
        </div>
        <div className="field">
          <label>Request body</label>
          <textarea
            className="textarea"
            value={step.config.body ?? ""}
            onChange={(event) => onChange({ body: event.target.value })}
          />
        </div>
        <div className="field">
          <label>Headers JSON</label>
          <textarea
            className="textarea"
            value={step.config.headers ?? ""}
            onChange={(event) => onChange({ headers: event.target.value })}
          />
        </div>
      </>
    );
  }

  return (
    <div className="field">
      <label>Message</label>
      <textarea
        className="textarea"
        value={step.config.message ?? ""}
        onChange={(event) => onChange({ message: event.target.value })}
      />
    </div>
  );
}

function defaultStepName(stepProviderId: string) {
  if (stepProviderId === "email.send") {
    return "Send email";
  }

  if (stepProviderId === "http.request") {
    return "Call API";
  }

  return "Log message";
}

function defaultStepConfig(stepProviderId: string): StepDraft["config"] {
  if (stepProviderId === "email.send") {
    return {
      to: "",
      subject: "WorkLane event for {{event.name}}",
      body: "Hello, WorkLane received an event from {{event.source}}.",
    };
  }

  if (stepProviderId === "http.request") {
    return {
      url: "https://httpbin.org/post",
      method: "POST",
      body: '{"name":"{{event.name}}","source":"{{event.source}}","sentFrom":"WorkLane"}',
      headers: '{\n  "Content-Type": "application/json"\n}',
    };
  }

  return {
    message: "Received payload for {{event.name}}",
  };
}

function buildStepConfig(step: StepDraft) {
  if (step.stepProviderId === "email.send") {
    return {
      to: step.config.to,
      subject: step.config.subject,
      body: step.config.body,
    };
  }

  if (step.stepProviderId === "http.request") {
    return {
      url: step.config.url,
      method: step.config.method,
      body: step.config.body,
      headers: step.config.headers ? JSON.parse(step.config.headers) : undefined,
    };
  }

  return {
    message: step.config.message,
  };
}
