import type { Metadata } from "next";
import "./globals.css";
import { ArcadeProvider } from "@/components/providers/ArcadeProvider";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { GlobalFooter } from "@/components/layout/GlobalFooter";

export const metadata: Metadata = {
  title: "ForgeSpace — 3D & 2D Virtual Office Platform for Remote Teams",
  description:
    "Instant browser-based 3D & 2D virtual office for remote teams. Features WebGL isometric floors, P2P WebRTC proximity audio, soundproof meeting rooms, claimable desks, and collaborative whiteboards with $0 server cost.",
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
          <GlobalFooter />
        </ArcadeProvider>
      </body>
    </html>
  );
}
