"use client";

import type { ScreenshotMeta } from "@/lib/types";

interface ScreenshotGalleryProps {
  screenshots: ScreenshotMeta[];
}

export function ScreenshotGallery({ screenshots }: ScreenshotGalleryProps) {
  if (screenshots.length === 0) {
    return (
      <div className="text-zinc-500 text-sm text-center py-6">
        No screenshots yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {screenshots.map((s) => (
        <a
          key={s.id}
          href={s.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative rounded-lg overflow-hidden border border-zinc-700 hover:border-blue-500/50 transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api${s.file_url}`}
            alt={s.item_name}
            className="w-full h-32 object-cover object-top bg-zinc-800"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <p className="text-xs text-white truncate">{s.item_name}</p>
            <p className="text-xs text-zinc-400">
              {new Date(s.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      ))}
    </div>
  );
}
