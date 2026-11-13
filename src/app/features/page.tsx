"use client";

import React from "react";
import Link from "next/link";

interface FeatureDeepDive {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  specs: { label: string; value: string }[];
  bulletPoints: string[];
  ctaLink: string;
  ctaText: string;
}

const FEATURES_LIST: FeatureDeepDive[] = [
  {
    id: "3d-engine",
    badge: "Core Visual Engine",
    title: "3D Isometric WebGL Canvas",
    subtitle: "Fluid 60 FPS spatial navigation with procedural office architecture",
    description:
      "ForgeSpace delivers a full 3D isometric office environment rendered natively via WebGL with zero external npm bloat. Featuring procedural material floor zoning, elevated dynamic camera tracking, and raycast BFS pathfinding that routes smoothly around desks and partitions.",
    icon: "🧊",
    specs: [
      { label: "Rendering Tech", value: "Three.js WebGL Engine" },
      { label: "Frame Rate", value: "60 FPS Hardware-Accelerated" },
      { label: "Navigation", value: "Raycasted BFS Pathfinding" },
      { label: "View Modes", value: "3D Isometric & 2D Top-Down" },
    ],
    bulletPoints: [
      "Procedural floor zoning: Executive Boardroom walnut, War Room cyan glow, and Cafe slate",
      "Directional avatar rotation with walking bob animation and live speaking aura halos",
      "Point-and-click or tap-to-move with obstacle avoidance around workstations",
      "Toggle between modern 3D Isometric and classic 2D view modes with a single click",
    ],
    ctaLink: "/space/acme-hq",
    ctaText: "Experience 3D Floor Live",
  },
  {
    id: "spatial-audio",
    badge: "Voice & Audio",
    title: "P2P Spatial Audio Mesh",
    subtitle: "Conversations happen naturally over distance with zero server bandwidth bills",
    description:
      "Unlike flat video grid calls where 20 people fight over a single audio channel, ForgeSpace uses browser Web Audio API PannerNodes. Coworker voices grow louder as you walk near their desk, and fade away naturally into the background as you walk away.",
    icon: "🎙️",
    specs: [
      { label: "Architecture", value: "Direct P2P WebRTC Mesh" },
      { label: "Audio Synthesis", value: "Web Audio API PannerNode" },
      { label: "Falloff Radius", value: "Full volume <4 tiles, mute >8 tiles" },
      { label: "Server Cost", value: "$0 Bandwidth Overhead" },
    ],
    bulletPoints: [
      "Natural audio attenuation prevents meeting fatigue and eliminates constant unmuting",
      "Dynamic Voice Activity Detection (VAD) highlights speaking coworkers instantly",
      "Zero server transcoding latency: media streams flow directly between teammate browsers",
      "Background noise suppression and echo cancellation enabled by default",
    ],
    ctaLink: "/pricing",
    ctaText: "See Cost Comparison",
  },
  {
    id: "private-rooms",
    badge: "Privacy & Focus",
    title: "Soundproof Meeting Pods & Door Knocks",
    subtitle: "Confidential collaboration spaces with keycode locks and door admittance",
    description:
      "Need to hold an executive sync, client demo, or 1-on-1 performance review? Walk into the Glass Boardroom or Sprint War Room. Soundproof partition boundaries immediately isolate room voice channels from open office floor chatter.",
    icon: "🔒",
    specs: [
      { label: "Isolation Boundary", value: "100% Soundproof Glass Partition" },
      { label: "Access Control", value: "Passcode Lock & Door Knock" },
      { label: "Audio Chimes", value: "Synthesized Door Knock Alerts" },
      { label: "Capacity", value: "8 to 16 seats per room" },
    ],
    bulletPoints: [
      "Automatic audio isolation: teammates outside the room cannot hear internal discussions",
      "Lock rooms for private sessions with optional alphanumeric passcodes",
      "Outside coworkers can click 'Knock on Door' to chime occupants for admittance",
      "Quick-warp navigation buttons jump you directly to the Boardroom or War Room",
    ],
    ctaLink: "/space/acme-hq",
    ctaText: "Tour the Boardroom",
  },
  {
    id: "whiteboards",
    badge: "Collaboration Tools",
    title: "War Room Whiteboard & Sprint Board",
    subtitle: "Brainstorm sprints, sketch system architecture, and organize team stickies",
    description:
      "Step up to the War Room Whiteboard to unlock a dual-mode creative space. Use the freehand sketchpad with pens and highlighters for system diagrams, or switch to the Sprint Wall to post colored sticky notes and action items.",
    icon: "📋",
    specs: [
      { label: "Canvas Mode", value: "Freehand Vector Sketchpad" },
      { label: "Sprint Board", value: "Interactive Color-Coded Stickies" },
      { label: "Export", value: "High-Res PNG Snapshot" },
      { label: "Tools", value: "Pen, Marker, Eraser, 3 Stroke Sizes" },
    ],
    bulletPoints: [
      "Subtle architectural grid lines for precise wireframing and flowcharts",
      "Yellow, Blue, Green, and Pink sticky notes with instant task card creation",
      "Export your complete drawing to PNG with 1-click for Slack, Notion, or GitHub PRs",
      "Access as a standalone full-page app or inside any virtual office room",
    ],
    ctaLink: "/whiteboard",
    ctaText: "Open Whiteboard App",
  },
  {
    id: "lofi-radio",
    badge: "Ambient Wellness",
    title: "Lo-Fi Cafe Radio & Espresso Bar",
    subtitle: "Synthesized focus beats and energizing espresso boosts in the breakroom",
    description:
      "Take a break in the cafe lounge. ForgeSpace includes a built-in Lo-Fi Radio synthesizing continuous procedural ambient tracks—no external streaming music licenses or YouTube copyright strikes. Grab an espresso for a 20-second movement boost!",
    icon: "☕",
    specs: [
      { label: "Audio Synthesizer", value: "Pure Web Audio API Waves" },
      { label: "Radio Stations", value: "Midnight Coding, Rainy Cafe, Deep Space" },
      { label: "Speed Boost", value: "+50% Movement Speed for 20s" },
      { label: "Interactive Furniture", value: "Vintage Radio, Espresso Bar, Watercooler" },
    ],
    bulletPoints: [
      "Procedural rain, vinyl warmth, and pentatonic synth melodies synthesized in real-time",
      "Espresso machine plays realistic steam brewing audio and gives avatars a speed boost",
      "Watercooler chit-chat icebreaker prompt generator for spontaneous watercooler talk",
      "No external Spotify/YouTube logins or audio tracking scripts",
    ],
    ctaLink: "/space/study-cafe",
    ctaText: "Visit Cafe Lounge",
  },
  {
    id: "theater-share",
    badge: "Presentations",
    title: "HD Screen Share Theater Mode",
    subtitle: "Lag-free multi-screen streaming with 1-click cinema mode",
    description:
      "Share your terminal, Figma canvas, or slide deck with peer-to-peer WebRTC streaming. When a teammate shares their screen, a theater mode prompt appears in the boardroom, allowing everyone to view the presentation in high definition.",
    icon: "🖥️",
    specs: [
      { label: "Resolution", value: "Up to 1080p 60 FPS" },
      { label: "Latency", value: "< 25ms Peer-to-Peer" },
      { label: "Layouts", value: "Floating Head Bubbles or Docked Video Strip" },
      { label: "Theater Mode", value: "Full-screen Presentation Modal" },
    ],
    bulletPoints: [
      "Instant 1-click screen sharing with browser audio support",
      "Floating video bubbles stay anchored above avatars or dock neatly along the bottom",
      "Full-screen Theater Mode provides crisp text rendering for code reviews and Figma demos",
      "Zero central video gateway transcoding lag or pixelated compression",
    ],
    ctaLink: "/spaces",
    ctaText: "Select an Office",
  },
];

export default function FeaturesPage() {
  return (
    <div className="py-8 px-4 md:px-8 max-w-[1280px] mx-auto space-y-16">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 border border-accent/40 text-accent font-display text-xs font-semibold uppercase tracking-wider">
          Architecture & Feature Specifications
        </div>
        <h1 className="font-display text-3xl md:text-5xl font-extrabold text-text uppercase tracking-tight">
          Engineered for Deep Remote Flow
        </h1>
        <p className="text-sm md:text-base text-text-muted leading-relaxed">
          Explore the technical foundation, spatial audio math, 3D WebGL rendering, and privacy architecture powering ForgeSpace virtual offices.
        </p>
      </div>

      {/* Feature Deep Dive Cards */}
      <div className="space-y-12">
        {FEATURES_LIST.map((feat, idx) => (
          <div
            key={feat.id}
            id={feat.id}
            className={`p-6 md:p-10 rounded-container border-2 border-border bg-surface shadow-arcade flex flex-col lg:flex-row gap-8 items-start ${
              idx % 2 === 1 ? "lg:flex-row-reverse" : ""
            }`}
          >
            {/* Left Content */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{feat.icon}</span>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-accent/15 text-accent border border-accent/30 font-semibold uppercase">
                  {feat.badge}
                </span>
              </div>

              <div>
                <h2 className="font-display text-xl md:text-3xl font-bold text-text uppercase tracking-tight">
                  {feat.title}
                </h2>
                <p className="text-xs md:text-sm text-accent font-medium mt-1">
                  {feat.subtitle}
                </p>
              </div>

              <p className="text-xs md:text-sm text-text-muted leading-relaxed">
                {feat.description}
              </p>

              {/* Bullet points */}
              <ul className="space-y-2 pt-2 border-t border-border/60">
                {feat.bulletPoints.map((bp, i) => (
                  <li key={i} className="text-xs text-text flex items-start gap-2">
                    <span className="text-accent font-bold">✓</span>
                    <span>{bp}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-2">
                <Link
                  href={feat.ctaLink}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-bg font-display font-bold text-xs rounded-control shadow-sm hover:brightness-110 transition-all"
                >
                  <span>{feat.ctaText}</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* Right Tech Specs Table Card */}
            <div className="w-full lg:w-80 bg-surface-2 border border-border rounded-xl p-5 space-y-3 flex-shrink-0">
              <div className="text-xs font-display font-bold uppercase tracking-wider text-text pb-2 border-b border-border">
                Technical Specifications
              </div>
              <div className="space-y-2.5">
                {feat.specs.map((sp) => (
                  <div key={sp.label} className="text-xs">
                    <span className="text-[10px] font-mono uppercase text-text-muted block">
                      {sp.label}
                    </span>
                    <span className="font-display font-bold text-accent">
                      {sp.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA Banner */}
      <div className="p-8 rounded-container bg-gradient-to-r from-accent/20 via-surface-2 to-surface border-2 border-accent text-center space-y-4">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-text uppercase">
          Ready to Step Onto Your Virtual Floor?
        </h2>
        <p className="text-xs md:text-sm text-text-muted max-w-xl mx-auto">
          Start collaborating with your team in 3D right now. Zero setup fees, zero software installation required.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/spaces"
            className="px-6 py-3 bg-accent text-bg font-display font-bold text-xs md:text-sm rounded-control shadow-arcade hover:brightness-110 transition-all"
          >
            Explore Floorplans Catalog →
          </Link>
          <Link
            href="/pricing"
            className="px-6 py-3 bg-surface-2 border border-border text-text font-display font-semibold text-xs md:text-sm rounded-control hover:bg-surface transition-all"
          >
            View Pricing & Architecture
          </Link>
        </div>
      </div>
    </div>
  );
}
