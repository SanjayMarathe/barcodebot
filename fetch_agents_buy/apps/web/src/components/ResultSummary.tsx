"use client";

import type { BuyResult } from "@/lib/types";

interface ResultSummaryProps {
  results: BuyResult[];
  totalBudget: number;
  totalSpent: number;
}

export function ResultSummary({ results, totalBudget, totalSpent }: ResultSummaryProps) {
  if (results.length === 0) {
    return (
      <div className="text-zinc-500 text-sm text-center py-6">
        No results yet
      </div>
    );
  }

  const successCount = results.filter((r) => r.status === "success").length;

  return (
    <div>
      {/* Summary bar */}
      <div className="flex items-center justify-between mb-4 p-3 bg-zinc-800 rounded-lg">
        <div className="text-sm">
          <span className="text-green-400 font-semibold">{successCount}</span>
          <span className="text-zinc-400"> / {results.length} items added to cart</span>
        </div>
        <div className="text-sm">
          <span className="text-zinc-400">Spent: </span>
          <span className="text-white font-semibold">${totalSpent.toFixed(2)}</span>
          <span className="text-zinc-500"> / ${totalBudget.toFixed(2)}</span>
        </div>
      </div>

      {/* Results table */}
      <div className="space-y-2">
        {results.map((result) => (
          <div
            key={result.item_name}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              result.status === "success"
                ? "border-green-500/30 bg-green-500/5"
                : result.status === "skipped"
                ? "border-yellow-500/30 bg-yellow-500/5"
                : "border-red-500/30 bg-red-500/5"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-lg shrink-0">
                {result.status === "success" ? "✓" : result.status === "skipped" ? "⊘" : "✗"}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-100 truncate">{result.item_name}</p>
                {result.error && (
                  <p className="text-xs text-red-400 truncate">{result.error}</p>
                )}
                {result.agent_name && (
                  <p className="text-xs text-zinc-500">via {result.agent_name}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 ml-2">
              {result.final_price != null && result.final_price > 0 && (
                <span className="text-sm font-semibold text-zinc-100">
                  ${result.final_price.toFixed(2)}
                  {result.quantity > 1 && (
                    <span className="text-zinc-400 font-normal"> ×{result.quantity}</span>
                  )}
                </span>
              )}
              {result.screenshot_url && (
                <a
                  href={result.screenshot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Screenshot ↗
                </a>
              )}
              {result.live_view_url && (
                <a
                  href={result.live_view_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Session ↗
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
