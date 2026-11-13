import type { Metadata } from "next";
import "./globals.css";
import { ArcadeProvider } from "@/components/providers/ArcadeProvider";
import { GlobalHeader } from "@/components/layout/GlobalHeader";

export const metadata: Metadata = {
  title: "ForgeSpace — Lightweight 2D Virtual Office & Team Hangouts",
  description:
    "Instant browser-based 2D virtual office for remote teams. Features P2P WebRTC proximity audio/video, soundproof meeting rooms, claimable desks, and collaborative whiteboards with $0 server cost.",
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
                  Forge<span className="text-accent">Space</span>
                </span>
                <span>•</span>
                <span>Lightweight 2D Virtual Office Platform</span>
              </div>
              <div className="flex items-center gap-4">
                <span>P2P WebRTC Spatial Proximity</span>
                <span>•</span>
                <span>$0 Server Bandwidth Overhead</span>
              </div>
            </div>
          </footer>
        </ArcadeProvider>
      </body>
    </html>
  );
}
