/**
 * Type-safe token values for Qarar design system.
 * Used by JavaScript components (React, charts, canvas, AST presets).
 */

export const qararTokens = {
  light: {
    mode: "light" as const,
    primary: "#2563eb",
    primaryHover: "#1d4ed8",
    primaryLight: "#3b82f6",
    primarySubtle: "rgba(37, 99, 235, 0.08)",
    primaryAlpha: "rgba(37, 99, 235, 0.12)",

    accent: "#059669",
    accentHover: "#047857",
    accentLight: "#10b981",
    accentSubtle: "rgba(5, 150, 105, 0.08)",
    accentAlpha: "rgba(5, 150, 105, 0.12)",

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

    text: "#09090b",
    textMuted: "#64748b",
    textSubtle: "#94a3b8",

    codeBg: "#f8fafc",
    codeBorder: "#e2e8f0",
    codeText: "#0f172a",
    codeTs: "#2563eb",
    tsCodeText: "#2563eb",

    inputBg: "#ffffff",
    inputBorder: "#cbd5e1",
    inputText: "#09090b",
    inputDataColor: "#10b981",

    pass: "#10b981",
    passBg: "rgba(16, 185, 129, 0.1)",
    passBorder: "rgba(16, 185, 129, 0.25)",
    fail: "#ef4444",
    failBg: "rgba(239, 68, 68, 0.1)",
    failBorder: "rgba(239, 68, 68, 0.25)",
    warn: "#f59e0b",
    warnBg: "rgba(245, 158, 11, 0.1)",
    warnBorder: "rgba(245, 158, 11, 0.25)",

    shadowSm: "0 1px 3px rgba(0, 0, 0, 0.05)",
    shadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
    shadowLg: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)",

    tabActiveBg: "#f1f5f9",
    noticeBg: "rgba(37, 99, 235, 0.08)",
    noticeBorder: "#2563eb",
    noticeText: "#1d4ed8",
  },
  dark: {
    mode: "dark" as const,
    primary: "#3b82f6",
    primaryHover: "#60a5fa",
    primaryLight: "#93c5fd",
    primarySubtle: "rgba(59, 130, 246, 0.15)",
    primaryAlpha: "rgba(59, 130, 246, 0.2)",

    accent: "#10b981",
    accentHover: "#34d399",
    accentLight: "#6ee7b7",
    accentSubtle: "rgba(16, 185, 129, 0.15)",
    accentAlpha: "rgba(16, 185, 129, 0.2)",

    bg: "#09090b",
    cardBg: "#121215",
    subcardBg: "#18181b",
    surface: "#121215",
    surface2: "#18181b",
    surface3: "#27272a",
    surfaceSubtle: "#0f0f12",

    border: "#27272a",
    borderHover: "#3f3f46",
    borderSubtle: "#1f1f23",

    text: "#fafafa",
    textMuted: "#a1a1aa",
    textSubtle: "#71717a",

    codeBg: "#0d0e12",
    codeBorder: "#27272a",
    codeText: "#e4e4e7",
    codeTs: "#60a5fa",
    tsCodeText: "#60a5fa",

    inputBg: "#0c0d10",
    inputBorder: "#27272a",
    inputText: "#fafafa",
    inputDataColor: "#10b981",

    pass: "#10b981",
    passBg: "rgba(16, 185, 129, 0.15)",
    passBorder: "rgba(16, 185, 129, 0.3)",
    fail: "#ef4444",
    failBg: "rgba(239, 68, 68, 0.15)",
    failBorder: "rgba(239, 68, 68, 0.3)",
    warn: "#f59e0b",
    warnBg: "rgba(245, 158, 11, 0.15)",
    warnBorder: "rgba(245, 158, 11, 0.3)",

    shadowSm: "0 2px 8px rgba(0, 0, 0, 0.3)",
    shadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
    shadowLg: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",

    tabActiveBg: "#18181b",
    noticeBg: "rgba(59, 130, 246, 0.12)",
    noticeBorder: "#3b82f6",
    noticeText: "#93c5fd",
  },
} as const;

export type QararTheme = { [K in keyof typeof qararTokens.dark]: string };

/**
 * Universal CSS custom-property theme map.
 * When passed to React components, elements use CSS variables directly,
 * eliminating SSR/client hydration flashes and automatically reacting to `data-theme`.
 */
export const cssVarTokens: QararTheme = {
  mode: "light",
  primary: "var(--qarar-primary)",
  primaryHover: "var(--qarar-primary-hover)",
  primaryLight: "var(--qarar-primary-light)",
  primarySubtle: "var(--qarar-primary-subtle)",
  primaryAlpha: "var(--qarar-primary-alpha)",
  accent: "var(--qarar-accent)",
  accentHover: "var(--qarar-accent-hover)",
  accentLight: "var(--qarar-accent-light)",
  accentSubtle: "var(--qarar-accent-subtle)",
  accentAlpha: "var(--qarar-accent-alpha)",
  bg: "var(--qarar-bg)",
  cardBg: "var(--qarar-surface)",
  subcardBg: "var(--qarar-surface-2)",
  surface: "var(--qarar-surface)",
  surface2: "var(--qarar-surface-2)",
  surface3: "var(--qarar-surface-3)",
  surfaceSubtle: "var(--qarar-surface-subtle)",
  border: "var(--qarar-border)",
  borderHover: "var(--qarar-border-hover)",
  borderSubtle: "var(--qarar-border-subtle)",
  text: "var(--qarar-text)",
  textMuted: "var(--qarar-text-muted)",
  textSubtle: "var(--qarar-text-subtle)",
  codeBg: "var(--qarar-code-bg)",
  codeBorder: "var(--qarar-code-border)",
  codeText: "var(--qarar-code-text)",
  codeTs: "var(--qarar-code-ts)",
  tsCodeText: "var(--qarar-code-ts)",
  inputBg: "var(--qarar-input-bg)",
  inputBorder: "var(--qarar-input-border)",
  inputText: "var(--qarar-input-text)",
  inputDataColor: "var(--qarar-input-data)",
  pass: "var(--qarar-pass)",
  passBg: "var(--qarar-pass-bg)",
  passBorder: "var(--qarar-pass-border)",
  fail: "var(--qarar-fail)",
  failBg: "var(--qarar-fail-bg)",
  failBorder: "var(--qarar-fail-border)",
  warn: "var(--qarar-warn)",
  warnBg: "var(--qarar-warn-bg)",
  warnBorder: "var(--qarar-warn-border)",
  shadowSm: "var(--qarar-shadow-sm)",
  shadow: "var(--qarar-shadow)",
  shadowLg: "var(--qarar-shadow-lg)",
  tabActiveBg: "var(--qarar-surface-3)",
  noticeBg: "var(--qarar-primary-subtle)",
  noticeBorder: "var(--qarar-primary)",
  noticeText: "var(--qarar-primary)",
};

/**
 * Resolves the active QararTheme tokens based on dark/light mode state.
 */
export function getThemeTokens(isDark: boolean = true): QararTheme {
  return (isDark ? qararTokens.dark : qararTokens.light) as QararTheme;
}
