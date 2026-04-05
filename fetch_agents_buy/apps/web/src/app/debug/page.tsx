"use client";

import { useEffect, useState } from "react";
import { getHealth, getRegistry, getModes } from "@/lib/api";
import { ModeToggle } from "@/components/ModeToggle";
import type { AgentRegistry, HealthResponse } from "@/lib/types";

export default function DebugPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [registry, setRegistry] = useState<AgentRegistry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getHealth(), getRegistry()])
      .then(([h, r]) => {
        setHealth(h);
        setRegistry(r);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold text-white mb-6">Debug</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          Error: {error}
        </div>
      )}

      {/* Health */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-zinc-400 mb-3">System Health</h2>
        {loading ? (
          <div className="text-zinc-500 text-sm">Loading...</div>
        ) : health ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "API", value: health.status, ok: health.status === "ok" },
              { label: "Database", value: health.db, ok: health.db === "ok" },
              { label: "Agents", value: health.agents_reachable ? "reachable" : "unreachable", ok: health.agents_reachable },
              { label: "Version", value: health.version, ok: true },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-zinc-800 p-3">
                <div className="text-xs text-zinc-500 mb-1">{item.label}</div>
                <div className={`text-sm font-medium ${item.ok ? "text-green-400" : "text-red-400"}`}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Mode toggles */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-zinc-400 mb-3">Runtime Modes</h2>
        <ModeToggle />
      </section>

      {/* Agent registry */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-zinc-400 mb-3">Agent Registry</h2>
        {registry ? (
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900">
                  <th className="text-left p-3 text-zinc-500 font-medium">Agent</th>
                  <th className="text-left p-3 text-zinc-500 font-medium">Address</th>
                  <th className="text-left p-3 text-zinc-500 font-medium">Port</th>
                  <th className="text-left p-3 text-zinc-500 font-medium">Role</th>
                </tr>
              </thead>
              <tbody>
                {registry.agents.map((agent) => (
                  <tr key={agent.name} className="border-b border-zinc-800/50 last:border-0">
                    <td className="p-3 font-semibold text-zinc-200">{agent.name}</td>
                    <td className="p-3 font-mono text-xs text-zinc-400 truncate max-w-xs" title={agent.address}>
                      {agent.address}
                    </td>
                    <td className="p-3 text-zinc-400">{agent.port}</td>
                    <td className="p-3 text-zinc-500 text-xs">{agent.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-zinc-500 text-sm">Loading registry...</div>
        )}
      </section>

      {/* Env check */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-400 mb-3">Required Credentials</h2>
        <div className="rounded-lg border border-zinc-800 p-4 font-mono text-xs text-zinc-400 space-y-1">
          <p>Check that these are set in your <span className="text-zinc-200">.env</span> file:</p>
          <ul className="mt-2 space-y-1 text-zinc-500">
            <li>BROWSER_USE_API_KEY — <span className="text-yellow-400">required for browser automation</span></li>
            <li>AGENTVERSE_API_KEY — <span className="text-blue-400">required for Agentverse mailbox</span></li>
            <li>ORCHESTRATOR_SEED — <span className="text-zinc-400">set to a private seed phrase</span></li>
            <li>STRIPE_SECRET_KEY — <span className="text-zinc-600">optional, test-mode treasury only</span></li>
          </ul>
        </div>
      </section>
    </div>
  );
}
