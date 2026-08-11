import Link from "next/link";
import { Fragment } from "react";
import {
  Activity,
  ArrowRight,
  Clock3,
  Database,
  GitBranch,
  Mail,
  Network,
  Radio,
  Route,
  ShieldCheck,
  Terminal,
  Webhook,
} from "lucide-react";

const services = [
  {
    icon: Webhook,
    title: "Webhook ingestion",
    copy: "Receive events from forms, services, payments, repos, and internal tools.",
  },
  {
    icon: Clock3,
    title: "Scheduled runs",
    copy: "Run workflows on repeat without tying them to a human click.",
  },
  {
    icon: Radio,
    title: "Manual launches",
    copy: "Kick off a workflow from the dashboard when an operator needs control.",
  },
  {
    icon: Mail,
    title: "Pluggable steps",
    copy: "Send email, call APIs, log events, and extend the engine with new providers.",
  },
];

const pipeline = [
  {
    label: "Trigger",
    detail: "webhook / manual / schedule",
    tone: "green",
  },
  {
    label: "Execution",
    detail: "run state is created",
    tone: "blue",
  },
  {
    label: "Outbox",
    detail: "safe database queue",
    tone: "amber",
  },
  {
    label: "Kafka",
    detail: "event stream",
    tone: "pink",
  },
  {
    label: "Executor",
    detail: "steps run in order",
    tone: "purple",
  },
];

const commandLines = [
  'workflow.trigger("schedule.interval")',
  'workflow.step("log.message")',
  'workflow.step("email.send")',
  "worklane deploy --watch-events",
];

const colorCells = Array.from({ length: 72 }, (_, index) => index);

export default function LandingPage() {
  return (
    <main className="landing">
      <div className="color-grid" aria-hidden="true">
        {colorCells.map((cell) => (
          <span
            key={cell}
            style={
              {
                "--cell-delay": `${(cell % 18) * 0.28}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <nav className="landing-nav">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Route size={19} />
          </span>
          <span>WorkLane</span>
        </Link>
        <div className="nav">
          <Link className="btn secondary" href="/dashboard">
            Dashboard
          </Link>
          <Link className="btn" href="/signup">
            Start building
          </Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="hero-copy">
          <p className="retro-kicker">EVENT-DRIVEN WORKFLOWS / NO QUEUE DRAMA</p>
          <h1>Automations that move through a real execution pipeline.</h1>
          <div className="type-line" aria-label="Webhook to Kafka to workers">
            webhook -&gt; outbox -&gt; kafka -&gt; workers
          </div>
          <p className="hero-lede">
            WorkLane helps teams create webhook, manual, and scheduled workflows with a
            database-backed outbox, Kafka dispatching, and worker-executed steps.
          </p>
          <div className="hero-actions">
            <Link className="btn hero-btn" href="/workflows/new">
              Create workflow
              <ArrowRight size={18} />
            </Link>
            <Link className="btn secondary hero-btn" href="#flow">
              Watch the flow
            </Link>
          </div>
        </div>

        <div className="terminal-window editor-window" aria-label="WorkLane editor preview">
          <div className="terminal-bar">
            <span />
            <span />
            <span />
            <strong>worklane.workflow.ts</strong>
          </div>
          <div className="terminal-body">
            {commandLines.map((line, index) => (
              <p
                className="editor-command"
                key={line}
                style={
                  {
                    "--line": index,
                    "--chars": line.length,
                  } as React.CSSProperties
                }
              >
                <span>$</span> {line}
              </p>
            ))}
            <p className="ok editor-status">[ok] run queued -&gt; dispatcher -&gt; executor</p>
          </div>
        </div>
      </section>

      <section className="flow-section" id="flow" aria-label="Animated WorkLane pipeline">
        <div className="section-heading flow-heading">
          <p className="retro-kicker">HOW A RUN MOVES</p>
          <h2>From one event to a finished workflow.</h2>
        </div>
        <div className="flow-board">
          {pipeline.map((item, index) => (
            <Fragment key={item.label}>
              <div
                className={`flow-node ${item.tone}`}
                style={{ "--node": index } as React.CSSProperties}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
              </div>
              {index < pipeline.length - 1 && (
                <div
                  className="flow-connector"
                  style={{ "--node": index } as React.CSSProperties}
                />
              )}
            </Fragment>
          ))}
          <div className="flow-output">
            <Database size={18} />
            <strong>Execution history</strong>
            <span>visible in dashboard</span>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <p className="retro-kicker">SERVICE TYPES</p>
          <h2>One workflow, multiple ways to start.</h2>
        </div>
        <div className="landing-grid">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <article className="landing-card" key={service.title}>
                <Icon size={22} />
                <h3>{service.title}</h3>
                <p>{service.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-section retro-band">
        <div>
          <p className="retro-kicker">BUILT LIKE A BACKEND SYSTEM</p>
          <h2>Not just a form that sends an email.</h2>
          <p>
            WorkLane separates the control plane from ingestion, dispatching, and execution,
            so every run has traceable state and every service has a focused job.
          </p>
        </div>
        <div className="metrics-grid">
          <div>
            <Activity size={20} />
            <strong>Execution history</strong>
            <span>Track runs and step status</span>
          </div>
          <div>
            <GitBranch size={20} />
            <strong>Ordered steps</strong>
            <span>Run actions one by one</span>
          </div>
          <div>
            <Network size={20} />
            <strong>Kafka dispatch</strong>
            <span>Workers consume queued events</span>
          </div>
          <div>
            <ShieldCheck size={20} />
            <strong>Outbox pattern</strong>
            <span>Events survive service hiccups</span>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <Terminal size={24} />
        <h2>Start with one trigger. Grow into a platform.</h2>
        <p>Create your first workflow, send a test event, and watch the pipeline run.</p>
        <Link className="btn hero-btn" href="/signup">
          Create account
          <ArrowRight size={18} />
        </Link>
      </section>
    </main>
  );
}
