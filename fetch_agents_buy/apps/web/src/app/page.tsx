"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChatInput } from "@/components/ChatInput";
import { ModeToggle } from "@/components/ModeToggle";
import { createRun } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (instruction: string, budget: number) => {
    setLoading(true);
    setError(null);
    try {
      const { run_id } = await createRun(instruction, budget);
      router.push(`/run/${run_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start run");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Multi-Agent Amazon Shopping
        </h1>
        <p className="text-zinc-400 text-sm">
          Give a clear shopping list. Nine Fetch.ai agents will search, rank, approve, and add to cart — in parallel.
        </p>
      </div>

      {/* Chat input */}
      <ChatInput onSubmit={handleSubmit} loading={loading} />

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* How it works */}
      <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: "🔍", title: "Search", desc: "Amazon search via Browser Use" },
          { icon: "📊", title: "Rank", desc: "Best match by price + quality" },
          { icon: "💰", title: "Approve", desc: "Internal budget authorization" },
          { icon: "🛒", title: "Cart", desc: "Parallel add-to-cart + screenshot" },
        ].map((step) => (
          <div key={step.title} className="rounded-lg border border-zinc-800 p-3 text-center">
            <div className="text-2xl mb-1">{step.icon}</div>
            <div className="text-sm font-semibold text-zinc-200">{step.title}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{step.desc}</div>
          </div>
        ))}
      </div>

      {/* Mode toggles */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-zinc-400 mb-3">Runtime Modes</h2>
        <ModeToggle />
      </div>

      {/* ASI:One info */}
      <div className="mt-8 p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
        <h3 className="text-sm font-semibold text-blue-400 mb-1">ASI:One Compatible</h3>
        <p className="text-xs text-zinc-400">
          The orchestrator agent is registered on Agentverse and reachable via ASI:One chat.
          You can send shopping instructions directly through the ASI:One interface.
          See <span className="text-blue-400">docs/agentverse.md</span> for setup.
        </p>
      </div>
    </div>
  );
}
