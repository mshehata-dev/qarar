/**
 * Type-safe token values for Qarar design system.
 * Used by JavaScript components (React, charts, canvas, AST presets).
 */

export const qararTokens = {
  light: {
    mode: "light" as const,
    primary: "#0096c7",
    primaryHover: "#0077b6",
    primaryLight: "#48cae4",
    primarySubtle: "#0096c720",
    primaryAlpha: "rgba(0, 150, 199, 0.12)",

    accent: "#a68a64",
    accentHover: "#8c7352",
    accentLight: "#c2aa87",
    accentSubtle: "#a68a6420",
    accentAlpha: "rgba(166, 138, 100, 0.12)",

    bg: "#ffffff",
    cardBg: "#ffffff",
    subcardBg: "#f8fafc",
    surface: "#f8fafc",
    surface2: "#ffffff",
    surface3: "#f1f5f9",
    surfaceSubtle: "#f8fafc",

    border: "#e2e8f0",
    borderHover: "#cbd5e1",
    borderSubtle: "#cbd5e1",

    text: "#0f172a",
    textMuted: "#64748b",
    textSubtle: "#94a3b8",

    codeBg: "#f8fafc",
    codeBorder: "#e2e8f0",
    codeText: "#8c7352",
    codeTs: "#0077b6",
    tsCodeText: "#0077b6",

    inputBg: "#ffffff",
    inputBorder: "#cbd5e1",
    inputText: "#0f172a",
    inputDataColor: "#10b981",

    pass: "#10b981",
    passBg: "#10b98118",
    passBorder: "#10b98140",
    fail: "#ef4444",
    failBg: "#ef444418",
    failBorder: "#ef444440",
    warn: "#f59e0b",
    warnBg: "#f59e0b18",
    warnBorder: "#f59e0b40",

    shadowSm: "0 1px 3px rgba(0, 0, 0, 0.05)",
    shadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
    shadowLg: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)",

    tabActiveBg: "#f1f5f9",
    noticeBg: "#0096c718",
    noticeBorder: "#0096c7",
    noticeText: "#0077b6",
  },
  dark: {
    mode: "dark" as const,
    primary: "#0096c7",
    primaryHover: "#48cae4",
    primaryLight: "#90e0ef",
    primarySubtle: "#0096c726",
    primaryAlpha: "rgba(0, 150, 199, 0.2)",

    accent: "#a68a64",
    accentHover: "#c2aa87",
    accentLight: "#ddcbbb",
    accentSubtle: "#a68a6426",
    accentAlpha: "rgba(166, 138, 100, 0.2)",

    bg: "#030712",
    cardBg: "#0f172a",
    subcardBg: "#090d16",
    surface: "#0f172a",
    surface2: "#090d16",
    surface3: "#1e293b",
    surfaceSubtle: "#0b0f19",

    border: "#1e293b",
    borderHover: "#334155",
    borderSubtle: "#2a3447",

    text: "#f8fafc",
    textMuted: "#94a3b8",
    textSubtle: "#64748b",

    codeBg: "#0b0e17",
    codeBorder: "#2e261d",
    codeText: "#c2aa87",
    codeTs: "#48cae4",
    tsCodeText: "#48cae4",

    inputBg: "#020617",
    inputBorder: "#1e293b",
    inputText: "#f8fafc",
    inputDataColor: "#10b981",

    pass: "#10b981",
    passBg: "#10b98122",
    passBorder: "#10b98150",
    fail: "#ef4444",
    failBg: "#ef444422",
    failBorder: "#ef444450",
    warn: "#f59e0b",
    warnBg: "#f59e0b22",
    warnBorder: "#f59e0b50",

    shadowSm: "0 2px 8px rgba(0, 0, 0, 0.4)",
    shadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
    shadowLg: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",

    tabActiveBg: "#1e293b",
    noticeBg: "#0096c726",
    noticeBorder: "#0096c7",
    noticeText: "#90e0ef",
  },
} as const;

export type QararTheme = typeof qararTokens.dark;

/**
 * Resolves the active QararTheme tokens based on dark/light mode state.
 */
export function getThemeTokens(isDark: boolean = true): QararTheme {
  return (isDark ? qararTokens.dark : qararTokens.light) as QararTheme;
}
