/**
 * Where the hero crest goes: centred in the gap between the end of the
 * wordmark and the right edge of the screen.
 *
 * When that gap is narrower than the crest - which happens on smaller
 * desktops, where the headline is nearly as wide as the window - the crest is
 * scaled down to fit it. Growing the gap is not an option, and neither
 * overlapping the headline nor running off the screen is acceptable.
 */
export const CREST_MAX_WIDTH = 384;
/** Breathing room kept on each side of the crest */
export const CREST_MARGIN = 24;
/** Below this it would be too small to read as the crest */
export const CREST_MIN_WIDTH = 150;

export interface CrestPlacement {
  /** What the crest should be rendered at */
  width: number;
  /** Where its centre belongs, in viewport coordinates */
  centre: number;
}

export function placeCrest(wordmarkRight: number, viewportWidth: number): CrestPlacement {
  const gap = Math.max(0, viewportWidth - wordmarkRight);

  const width = Math.max(
    CREST_MIN_WIDTH,
    Math.min(CREST_MAX_WIDTH, gap - CREST_MARGIN * 2)
  );

  // Centred in the gap, then held inside both edges. The right edge wins if
  // even the smallest crest can't fit, so it never leaves the screen.
  const centre = Math.min(
    Math.max(wordmarkRight + CREST_MARGIN + width / 2, wordmarkRight + gap / 2),
    viewportWidth - CREST_MARGIN - width / 2
  );

  return { width, centre };
}
