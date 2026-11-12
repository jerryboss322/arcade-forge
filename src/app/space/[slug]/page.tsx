"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useArcade } from "@/components/providers/ArcadeProvider";
import { SpaceView } from "@/components/space/SpaceView";

const SPACE_PRESETS: Record<string, { name: string; description: string }> = {
  "acme-hq": {
    name: "Acme Tech HQ",
    description: "Modern startup headquarters with dual-monitor pods and glass boardroom.",
  },
  "indie-forge": {
    name: "Indie Dev Studio",
    description: "Creative pixel-art studio with breakroom arcade cabinet and brainstorm war room.",
  },
  "study-cafe": {
    name: "Late Night Study Cafe",
    description: "Cozy library atmosphere with quiet focus desks and espresso bar.",
  },
};

export default function SpaceSlugPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "acme-hq";
  const { currentUser } = useArcade();

  const preset = SPACE_PRESETS[slug] || {
    name: slug
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" "),
    description: "Custom virtual office powered by ForgeSpace P2P mesh.",
  };

  // Determine avatar color from current user or hash of name
  const avatarColors = ["#37E6C4", "#FF0055", "#FFC53D", "#00A8FF", "#B84DFF", "#FF7A00"];
  const colorIndex =
    Math.abs(
      (currentUser?.username || "Guest")
        .split("")
        .reduce((acc, c) => acc + c.charCodeAt(0), 0)
    ) % avatarColors.length;
  const avatarColor = avatarColors[colorIndex];

  return (
    <SpaceView
      spaceSlug={slug}
      spaceName={preset.name}
      initialUserName={currentUser?.username || "Guest"}
      initialAvatarColor={avatarColor}
    />
  );
}
