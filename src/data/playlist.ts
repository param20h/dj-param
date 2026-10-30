/**
 * Hardcoded YouTube playlist (must be public or unlisted, with embeddable videos).
 * Replace the placeholder with the real playlist ID. For quick testing, `?list=<id>` in the URL overrides it.
 */
const DEFAULT_PLAYLIST_ID = "PLG1mAGV7SXnXK770Wo8We_6PjpmhyhS51";

export const PLAYLIST_ID =
  new URLSearchParams(window.location.search).get("list") ??
  DEFAULT_PLAYLIST_ID;

export const ACCENTS = ["blue", "red", "yellow", "green"] as const;
export type Accent = (typeof ACCENTS)[number];

export const ACCENT_HEX: Record<
  Accent,
  { core: string; halftone: string; pastel: string }
> = {
  blue: { core: "#4285f4", halftone: "#57caff", pastel: "#c3ecf6" },
  red: { core: "#ea4335", halftone: "#ff7daf", pastel: "#f8d8d8" },
  yellow: { core: "#f9ab00", halftone: "#ffd427", pastel: "#ffe7a5" },
  green: { core: "#34a853", halftone: "#5cdb6d", pastel: "#ccf6c5" },
};

export const LOGO_FOR: Record<Accent, string> = {
  blue: `${import.meta.env.BASE_URL}brand/GDG-Jalandhar-Logo-Blue-Light.svg`,
  red: `${import.meta.env.BASE_URL}brand/GDG-Jalandhar-Logo-Red-Light.svg`,
  yellow: `${import.meta.env.BASE_URL}brand/GDG-Jalandhar-Logo-Yellow-Light.svg`,
  green: `${import.meta.env.BASE_URL}brand/GDG-Jalandhar-Logo-Green-Light.svg`,
};
