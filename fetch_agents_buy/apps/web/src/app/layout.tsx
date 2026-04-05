import type { Metadata } from "next";
import Link from "next/link";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "DiamondHacks — Shopping Agent",
  description: "Multi-agent Amazon shopping automation powered by Fetch.ai uAgents",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 font-bold text-white">
                <span className="text-xl">💎</span>
                <span>ShopAgent</span>
                <span className="text-xs text-zinc-500 font-normal">by Fetch.ai</span>
              </Link>
              <div className="hidden sm:flex items-center gap-4 text-sm">
                <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
                  New Run
                </Link>
                <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
                  Dashboard
                </Link>
                <Link href="/debug" className="text-zinc-400 hover:text-white transition-colors">
                  Debug
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://agentverse.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Agentverse ↗
              </a>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>

        <footer className="border-t border-zinc-800 mt-12 py-4 text-center text-xs text-zinc-600">
          DiamondHacks 2026 — Fetch.ai Best Use Track
        </footer>
      </body>
    </html>
  );
}
