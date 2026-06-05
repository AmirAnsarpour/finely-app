/**
 * Normalizes digits from any script to ASCII so all numeric inputs work
 * regardless of keyboard layout or locale.
 *
 * Handles:
 *   - Persian/Farsi extended digits  ۰-۹  (U+06F0–U+06F9)
 *   - Arabic-Indic digits            ٠-٩  (U+0660–U+0669)
 *   - Arabic decimal separator       ٫    (U+066B) → "."
 *   - Arabic thousands separator     ٬    (U+066C) → removed
 */
export function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/٫/g, '.')
    .replace(/٬/g, '')
}
