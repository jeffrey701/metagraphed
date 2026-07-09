// #3937: a squarified treemap squashes the tail of a skewed distribution (the
// common Bittensor case — one validator dominates) into near-zero-height tiles
// whose label + value overlap into illegible text. Collapse the tail into a
// single "+N more" tile BEFORE layout so every rendered tile stays legible.

export interface TreemapDatum {
  label: string;
  value: number;
  color?: string;
}

export interface CollapseOptions {
  /** Tiles below this share of the total are candidates for grouping. */
  minShare?: number;
  /** Hard cap on rendered tiles (including the "+N more" tile). */
  maxTiles?: number;
  /** Color for the grouped "+N more" tile. */
  restColor?: string;
  /** Builds the grouped tile's label from the number of grouped items. */
  restLabel?: (n: number) => string;
}

const DEFAULTS = {
  minShare: 0.025,
  maxTiles: 10,
  restColor: "var(--surface-2)",
  restLabel: (n: number) => `+${n} more`,
};

/**
 * Reduce treemap data so no illegibly-small tiles are rendered: keep the largest
 * tiles that clear `minShare` (up to `maxTiles - 1`) and fold the rest into one
 * aggregated "+N more" tile. A lone tail tile is kept as-is rather than turned
 * into a pointless "+1 more". Non-positive / non-finite values are dropped.
 */
export function collapseSmallTreemapTiles(
  data: TreemapDatum[],
  options: CollapseOptions = {},
): TreemapDatum[] {
  const { minShare, maxTiles, restColor, restLabel } = { ...DEFAULTS, ...options };
  const positive = data.filter((d) => Number.isFinite(d.value) && d.value > 0);
  const total = positive.reduce((acc, d) => acc + d.value, 0);
  if (total <= 0) return [];

  const sorted = [...positive].sort((a, b) => b.value - a.value);
  const keep: TreemapDatum[] = [];
  const tail: TreemapDatum[] = [];
  for (const d of sorted) {
    const belowShare = d.value / total < minShare;
    const overCap = keep.length >= maxTiles - 1;
    if (belowShare || overCap) tail.push(d);
    else keep.push(d);
  }

  if (tail.length === 1) {
    // One small tile is fine on its own — grouping it would just read "+1 more".
    keep.push(tail[0]);
  } else if (tail.length > 1) {
    const restValue = tail.reduce((acc, d) => acc + d.value, 0);
    keep.push({ label: restLabel(tail.length), value: restValue, color: restColor });
  }
  return keep;
}
