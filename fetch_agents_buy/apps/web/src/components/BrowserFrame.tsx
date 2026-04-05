"use client";

interface BrowserFrameProps {
  liveViewUrl: string;
  title?: string;
  agentName?: string;
}

export function BrowserFrame({ liveViewUrl, title, agentName }: BrowserFrameProps) {
  if (!liveViewUrl) return null;

  return (
    <div className="rounded-lg border border-zinc-700 overflow-hidden bg-zinc-900">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            {agentName ? `${agentName} — ` : ""}{title || "Live Browser"}
          </span>
        </div>
        <a
          href={liveViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          Open ↗
        </a>
      </div>
      <iframe
        src={liveViewUrl}
        allow="clipboard-read; clipboard-write"
        className="w-full border-0"
        style={{ height: "500px" }}
        title={title || "Browser Use live session"}
      />
    </div>
  );
}
