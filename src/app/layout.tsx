import type { Metadata } from "next";
import "./globals.css";
import { ArcadeProvider } from "@/components/providers/ArcadeProvider";
import { GlobalHeader } from "@/components/layout/GlobalHeader";

export const metadata: Metadata = {
  title: "ArcadeForge — Build, Remix & Play Retro 2D & HTML5 Games",
  description:
    "Create 16x16 retro top-down games in Forge Studio or upload HTML5 game bundles. Deterministic 60Hz runtime, game jams, and community arcade.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg text-text antialiased pb-16 md:pb-0 flex flex-col min-h-screen">
        <ArcadeProvider>
          <GlobalHeader />
          <main className="flex-1">{children}</main>
          <footer className="border-t-2 border-border bg-surface mt-16 py-8">
            <div className="max-w-[1280px] mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
              <div className="flex items-center gap-2">
                <span className="font-display text-text uppercase">
                  Arcade<span className="text-accent">Forge</span>
                </span>
                <span>•</span>
                <span>Schema v1.1.0 Deterministic 60Hz Engine</span>
              </div>
              <div className="flex items-center gap-4">
                <span>Sandboxed HTML5 Origin Isolation</span>
                <span>•</span>
                <span>DMCA & Moderation Ready</span>
              </div>
            </div>
          </footer>
        </ArcadeProvider>
      </body>
    </html>
  );
}
