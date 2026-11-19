import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ArcadeProvider } from "@/components/providers/ArcadeProvider";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { GlobalFooter } from "@/components/layout/GlobalFooter";

const bricolage = localFont({
  src: "./fonts/bricolage-grotesque-latin.woff2",
  weight: "400 800",
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
  title: "ForgeSpace — Walk up to your teammate. Talk. Walk away.",
  description:
    "Your remote office in a browser tab. Walk up to a desk to talk, step inside a soundproof glass boardroom, and knock to join. Free for 4 people.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${bricolage.variable} ${inter.variable} ${jetbrainsMono.variable}`}
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
