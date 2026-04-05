"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listRuns } from "@/lib/api";

interface RunSummary {
  run_id: string;
  instruction: string;
  status: string;
  total_budget: number;
  total_spent: number;
  item_count: number;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-zinc-700 text-zinc-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  completed: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
};

export default function DashboardPage() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    listRuns(30)
      .then((data) => setRuns(data as RunSummary[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Agent Dashboard</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Refresh
          </button>
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Run
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-zinc-500 text-sm text-center py-12">Loading runs...</div>
      ) : runs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-500 mb-4">No runs yet</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">
            Start your first shopping run →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <Link
              key={run.run_id}
              href={`/run/${run.run_id}`}
              className="block rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 p-4 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{run.instruction}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-zinc-600 font-mono">{run.run_id.slice(0, 8)}...</span>
                    <span className="text-xs text-zinc-500">
                      {run.item_count} item{run.item_count !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(run.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {run.total_spent > 0 && (
                    <span className="text-sm font-semibold text-zinc-200">
                      ${run.total_spent.toFixed(2)}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[run.status] || STATUS_COLORS.pending}`}>
                    {run.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
