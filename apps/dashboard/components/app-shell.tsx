"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Route } from "lucide-react";
import { apiFetch } from "@/lib/api";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/signin");
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" href="/dashboard">
            <span className="brand-mark">
              <Route size={19} />
            </span>
            <span>WorkLane</span>
          </Link>
          <nav className="nav">
            <Link className="btn secondary" href="/dashboard">
              Workflows
            </Link>
            <Link className="btn" href="/workflows/new">
              New workflow
            </Link>
            <button className="btn secondary" onClick={logout} title="Log out">
              <LogOut size={16} />
            </button>
          </nav>
        </div>
      </header>
      <main className="page">{children}</main>
    </div>
  );
}
