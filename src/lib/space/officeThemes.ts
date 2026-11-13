export type OfficeThemeId = "midnight" | "daylight" | "espresso";

export interface OfficeTheme {
  id: OfficeThemeId;
  name: string;
  description: string;
  cssVars: {
    bg: string;
    surface: string;
    surface2: string;
    border: string;
    text: string;
    textMuted: string;
    accent: string;
    accent2: string;
  };
  scene: {
    skyHex: number;
    fogHex: number;
    hemiSkyHex: number;
    hemiGroundHex: number;
    hemiIntensity: number;
    dirIntensity: number;
  };
}

export const OFFICE_THEMES: Record<OfficeThemeId, OfficeTheme> = {
  midnight: {
    id: "midnight",
    name: "Midnight Studio",
    description: "Deep indigo studio lighting with neon cyan and magenta accents.",
    cssVars: {
      bg: "#0B0C14",
      surface: "#14162A",
      surface2: "#1D2040",
      border: "#2B2F5A",
      text: "#EDEEFF",
      textMuted: "#9A9DC8",
      accent: "#FF4D8D",
      accent2: "#37E6C4",
    },
    scene: {
      skyHex: 0x0b0c14,
      fogHex: 0x0b0c14,
      hemiSkyHex: 0xc2d5ff,
      hemiGroundHex: 0x16182c,
      hemiIntensity: 1.05,
      dirIntensity: 1.15,
    },
  },
  daylight: {
    id: "daylight",
    name: "Daylight Glass",
    description: "Crisp architectural skylight atmosphere with teal-blue highlights.",
    cssVars: {
      bg: "#101724",
      surface: "#182235",
      surface2: "#22304A",
      border: "#32476B",
      text: "#F3F8FF",
      textMuted: "#A5B9D6",
      accent: "#38BDF8",
      accent2: "#34D399",
    },
    scene: {
      skyHex: 0x182538,
      fogHex: 0x182538,
      hemiSkyHex: 0xe6f2ff,
      hemiGroundHex: 0x26354d,
      hemiIntensity: 1.35,
      dirIntensity: 1.3,
    },
  },
  espresso: {
    id: "espresso",
    name: "Warm Lounge",
    description: "Cozy late-afternoon amber studio tones inspired by the cafe corner.",
    cssVars: {
      bg: "#120E0D",
      surface: "#1E1715",
      surface2: "#2B211E",
      border: "#44342F",
      text: "#FFF6EE",
      textMuted: "#C8B3A6",
      accent: "#F59E0B",
      accent2: "#37E6C4",
    },
    scene: {
      skyHex: 0x16100e,
      fogHex: 0x16100e,
      hemiSkyHex: 0xffe4c4,
      hemiGroundHex: 0x261a16,
      hemiIntensity: 1.15,
      dirIntensity: 1.2,
    },
  },
};

export const OFFICE_THEME_LIST: OfficeTheme[] = [
  OFFICE_THEMES.midnight,
  OFFICE_THEMES.daylight,
  OFFICE_THEMES.espresso,
];

/**
 * Compute inline CSS variable overrides scoped to the SpaceView root container.
 */
export function getThemeCssVars(themeId: OfficeThemeId): Record<string, string> {
  const theme = OFFICE_THEMES[themeId] ?? OFFICE_THEMES.midnight;
  return {
    "--color-bg": theme.cssVars.bg,
    "--color-surface": theme.cssVars.surface,
    "--color-surface-2": theme.cssVars.surface2,
    "--color-border": theme.cssVars.border,
    "--color-text": theme.cssVars.text,
    "--color-text-muted": theme.cssVars.textMuted,
    "--color-accent": theme.cssVars.accent,
    "--color-accent-2": theme.cssVars.accent2,
  };
}
