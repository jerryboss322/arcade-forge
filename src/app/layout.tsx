import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ArcadeProvider } from "@/components/providers/ArcadeProvider";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { GlobalFooter } from "@/components/layout/GlobalFooter";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ForgeSpace — Spatial Virtual Office & Instant Team Presence",
  description:
    "Browser-based 3D and 2D virtual office for modern remote teams. Spatial presence, HD LiveKit audio/video, soundproof conference rooms, claimable desks, and instant invite links.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${plusJakarta.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-bg text-text font-sans antialiased pb-16 md:pb-0 flex flex-col min-h-dvh">
        <ArcadeProvider>
          <GlobalHeader />
          <main className="flex-1">{children}</main>
          <GlobalFooter />
        </ArcadeProvider>
      </body>
    </html>
  );
}
