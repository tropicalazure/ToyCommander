// Shared avatar presets — single source of truth for profile colors/emojis.
//
// NOTE: the glow class strings below are kept as complete literals (not
// composed at runtime) because Tailwind's JIT compiler only generates
// arbitrary-value utilities like `shadow-[0_0_10px_...]` when it can find the
// exact class string in the source. Interpolating the radius/rgb would silently
// drop the shadow at build time. Standardized to a 10px / 0.4 glow everywhere.

export type AvatarColorId =
  | "magenta"
  | "lilac"
  | "cyan"
  | "emerald"
  | "violet"
  | "coral"
  | "yellow";

export const AVATAR_COLORS: { id: AvatarColorId; label: string }[] = [
  { id: "magenta", label: "Magenta" },
  { id: "lilac", label: "Lilac" },
  { id: "cyan", label: "Cyan" },
  { id: "emerald", label: "Emerald" },
  { id: "violet", label: "Violet" },
  { id: "coral", label: "Coral" },
  { id: "yellow", label: "Yellow" },
];

export const AVATAR_EMOJIS = [
  "👾", "🎮", "⚡", "🔥", "😈", "💖", "✨", "🌀", "👑", "🕶️", "🎯", "🪐",
];

export const DEFAULT_AVATAR_COLOR: AvatarColorId = "magenta";
export const DEFAULT_AVATAR_EMOJI = "👾";

const AVATAR_COLOR_CLASS: Record<string, string> = {
  magenta: "bg-primary text-white shadow-[0_0_10px_rgba(255,0,255,0.4)]",
  lilac: "bg-[#b794b7] text-black shadow-[0_0_10px_rgba(183,148,183,0.4)]",
  cyan: "bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]",
  emerald: "bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]",
  violet: "bg-violet-600 text-white shadow-[0_0_10px_rgba(124,58,237,0.4)]",
  coral: "bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.4)]",
  yellow: "bg-yellow-400 text-black shadow-[0_0_10px_rgba(234,179,8,0.4)]",
};

/** Tailwind classes (background + text + glow) for an avatar swatch/badge. */
export function getAvatarColorClass(colorName?: string): string {
  return (colorName && AVATAR_COLOR_CLASS[colorName]) || "bg-primary text-white";
}
