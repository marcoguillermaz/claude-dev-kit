/**
 * Tier suggestion thresholds — maps a project's file count to a
 * scaffold tier ('s' | 'm' | 's') using ecosystem-calibrated brackets.
 *
 * Three categories are tuned empirically:
 *
 *   nodeWeb  — Node/TS/JS web projects typically carry many small files
 *              (per-feature folders, route handlers, components); a
 *              30-file project is still "small" by web standards.
 *   medium   — Most app ecosystems (Python, Ruby, Java/Maven, Kotlin,
 *              Swift, .NET); 20+ files signals meaningful size.
 *   compact  — Terser ecosystems (Go, Rust, Java/Gradle) where one
 *              file often equates to one module; 15+ is meaningful.
 *
 * Each entry: { lToM, mToS } — fileCount > lToM → 'l', > mToS → 'm',
 * else 's'.
 */

export const TIER_THRESHOLDS = {
  nodeWeb: { lToM: 100, mToS: 30 },
  medium: { lToM: 80, mToS: 20 },
  compact: { lToM: 60, mToS: 15 },
};

/**
 * Map a file count to a suggested scaffold tier using the given
 * threshold pair.
 * @param {number} fileCount
 * @param {{lToM: number, mToS: number}} thresholds
 * @returns {'s' | 'm' | 'l'}
 */
export function suggestTier(fileCount, thresholds) {
  if (fileCount > thresholds.lToM) return 'l';
  if (fileCount > thresholds.mToS) return 'm';
  return 's';
}
