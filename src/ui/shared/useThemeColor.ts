import { useMemo } from 'react'
import { useSettingsStore } from '@/game/settingsStore'

/** Resolves a themed CSS custom property (e.g. "--color-ink-700") to its
 * current literal color string, re-read whenever the theme setting
 * changes. Only needed where a color has to be a plain string instead of
 * a Tailwind className or a `style` object -- Recharts and React Flow's
 * <Background> render color props as literal SVG attributes, which (unlike
 * a className or an inline `style` object) can't just reference
 * `var(--color-ink-700)` and pick up the live theme through the cascade,
 * so those spots need the resolved value instead. */
export function useThemeColor(cssVarName: string): string {
  const theme = useSettingsStore((s) => s.theme)
  return useMemo(() => {
    // theme is a dependency purely to force a re-resolve when it changes --
    // the actual value comes from the DOM, not from the store -- so
    // reference it here or the linter (correctly, from its own vantage
    // point) flags it as an unused dependency.
    void theme
    if (typeof window === 'undefined') return ''
    return getComputedStyle(document.documentElement).getPropertyValue(cssVarName).trim()
  }, [cssVarName, theme])
}
