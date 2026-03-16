const primary = "#6C63FF";
const secondary = "#FF6B35";
const accent = "#00D4FF";
const success = "#22C55E";
const warning = "#F59E0B";
const error = "#EF4444";

export default {
  light: {
    text: "#0F0F1A",
    textSecondary: "#6B6B8A",
    textMuted: "#9B9BB5",
    background: "#F8F8FF",
    backgroundSecondary: "#FFFFFF",
    card: "#FFFFFF",
    border: "#E8E8F0",
    tint: primary,
    tabIconDefault: "#9B9BB5",
    tabIconSelected: primary,
    primary,
    secondary,
    accent,
    success,
    warning,
    error,
    gradient: {
      primary: [primary, "#9C8FFF"] as [string, string],
      secondary: [secondary, "#FF9B6B"] as [string, string],
      accent: [accent, "#00A8CC"] as [string, string],
      dark: ["#1A1A2E", "#16213E"] as [string, string],
      card: ["#FFFFFF", "#F0F0FF"] as [string, string],
    },
  },
  dark: {
    text: "#F0F0FF",
    textSecondary: "#A0A0C0",
    textMuted: "#6B6B8A",
    background: "#0A0A1A",
    backgroundSecondary: "#12122A",
    card: "#1A1A2E",
    border: "#2A2A4A",
    tint: primary,
    tabIconDefault: "#6B6B8A",
    tabIconSelected: primary,
    primary,
    secondary,
    accent,
    success,
    warning,
    error,
    gradient: {
      primary: [primary, "#9C8FFF"] as [string, string],
      secondary: [secondary, "#FF9B6B"] as [string, string],
      accent: [accent, "#00A8CC"] as [string, string],
      dark: ["#1A1A2E", "#16213E"] as [string, string],
      card: ["#1A1A2E", "#12122A"] as [string, string],
    },
  },
};
