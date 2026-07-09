import { describe, it, expect } from "vitest";
import { collapseSmallTreemapTiles } from "./treemap-collapse";

const labels = (data: { label: string }[]) => data.map((d) => d.label);

describe("collapseSmallTreemapTiles", () => {
  it("folds the tail of a skewed distribution into one '+N more' tile", () => {
    // One dominant validator + 8 tiny tail tiles (the common Bittensor case).
    const data = [
      { label: "#1", value: 900 },
      ...Array.from({ length: 8 }, (_, i) => ({ label: `#${i + 2}`, value: 12 })),
    ];
    const out = collapseSmallTreemapTiles(data);
    expect(labels(out)).toEqual(["#1", "+8 more"]);
    // value is preserved by the grouping
    expect(out.reduce((a, d) => a + d.value, 0)).toBe(900 + 8 * 12);
    expect(out[1].value).toBe(8 * 12);
  });

  it("leaves an already-legible small distribution untouched", () => {
    const data = [
      { label: "a", value: 50 },
      { label: "b", value: 30 },
      { label: "c", value: 20 },
    ];
    expect(collapseSmallTreemapTiles(data)).toEqual(data);
  });

  it("keeps a lone tail tile rather than making a '+1 more'", () => {
    const data = [
      { label: "a", value: 60 },
      { label: "b", value: 39 },
      { label: "tiny", value: 1 }, // 1% < 2.5% minShare, but it is the only tail
    ];
    expect(labels(collapseSmallTreemapTiles(data))).toEqual(["a", "b", "tiny"]);
  });

  it("caps a large uniform distribution at maxTiles with a grouped remainder", () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ label: `#${i}`, value: 5 }));
    const out = collapseSmallTreemapTiles(data, { maxTiles: 10 });
    expect(out.length).toBe(10);
    expect(out[9].label).toBe("+11 more");
    expect(out.reduce((a, d) => a + d.value, 0)).toBe(100);
  });

  it("drops non-positive / non-finite values and returns [] when empty", () => {
    expect(collapseSmallTreemapTiles([{ label: "z", value: 0 }])).toEqual([]);
    expect(collapseSmallTreemapTiles([{ label: "n", value: NaN }])).toEqual([]);
    expect(
      labels(
        collapseSmallTreemapTiles([
          { label: "a", value: 10 },
          { label: "neg", value: -5 },
        ]),
      ),
    ).toEqual(["a"]);
  });
});
