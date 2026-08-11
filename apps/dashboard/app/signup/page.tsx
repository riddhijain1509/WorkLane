"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Route } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("Riddhi Jain");
  const [email, setEmail] = useState("riddhi@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      router.push("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-wrap">
      <section className="panel auth-panel">
        <div className="brand" style={{ marginBottom: 22 }}>
          <span className="brand-mark">
            <Route size={19} />
          </span>
          <span>WorkLane</span>
        </div>
        <p className="eyebrow">Create workspace</p>
        <h1>Start building workflows</h1>
        <p className="muted">Webhook triggers, queued execution, and provider-based steps.</p>

        <form className="stack" onSubmit={submit}>
          <div className="field">
            <label>Name</label>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="muted" style={{ marginTop: 18, marginBottom: 0 }}>
          Already have an account? <Link href="/signin">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
