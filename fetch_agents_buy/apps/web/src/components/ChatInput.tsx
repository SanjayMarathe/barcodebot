"use client";

import { useState } from "react";

interface ChatInputProps {
  onSubmit: (instruction: string, budget: number) => Promise<void>;
  loading?: boolean;
}

const EXAMPLES = [
  "Buy AA batteries under $18 quantity 2, USB-C charger 65W under $30 quantity 1",
  "Get 3 notebooks under $8 each on Amazon",
  "Buy: HDMI cable under $12, sticky notes under $5 quantity 3",
];

export function ChatInput({ onSubmit, loading = false }: ChatInputProps) {
  const [instruction, setInstruction] = useState("");
  const [budget, setBudget] = useState(200);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || loading) return;
    await onSubmit(instruction.trim(), budget);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 backdrop-blur-sm overflow-hidden">
        <textarea
          className="w-full bg-transparent px-4 pt-4 pb-2 text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none"
          rows={4}
          placeholder={`Shopping instruction, e.g.\n"Buy AA batteries under $18 quantity 2, USB-C charger under $30"`}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
          disabled={loading}
        />

        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">Budget $</label>
            <input
              type="number"
              min={1}
              max={1000}
              step={1}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-20 bg-zinc-800 text-zinc-100 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !instruction.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Running...
              </>
            ) : (
              <>Start Run ⌘↵</>
            )}
          </button>
        </div>
      </div>

      {/* Example prompts */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="text-xs text-zinc-600">Examples:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setInstruction(ex)}
            className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors truncate max-w-xs"
          >
            {ex.slice(0, 50)}...
          </button>
        ))}
      </div>
    </form>
  );
}
