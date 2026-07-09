import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiResult } from "./client";
import { apiFetch } from "./client";
import { blockEventsQuery } from "./queries";

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return { ...actual, apiFetch: vi.fn() };
});

const mockedApiFetch = vi.mocked(apiFetch);

function resolveWith(data: unknown): void {
  mockedApiFetch.mockResolvedValue({
    data,
    meta: {} as ApiResult<unknown>["meta"],
    url: "/api/v1/blocks/5000000/events",
  });
}

async function runQuery(ref: string) {
  const opts = blockEventsQuery(ref);
  if (!opts.queryFn) throw new Error("expected a queryFn");
  return opts.queryFn({
    signal: new AbortController().signal,
    queryKey: opts.queryKey,
    meta: undefined,
  } as unknown as Parameters<NonNullable<typeof opts.queryFn>>[0]);
}

describe("blockEventsQuery — amount_tao / alpha_amount normalization", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  it("keeps a block event's alpha_amount distinct from its TAO amount", async () => {
    // A StakeAdded row carrying both a TAO figure and an alpha-token figure.
    // These are separate quantities on the BlockEvent contract; normalizing
    // must not overwrite alpha_amount with the TAO-first coalesced amount.
    resolveWith({
      block_number: 5000000,
      event_count: 1,
      events: [
        {
          block_number: 5000000,
          event_index: 0,
          event_kind: "StakeAdded",
          hotkey: "5Ffff",
          amount_tao: 5,
          alpha_amount: 100,
        },
      ],
    });
    const res = await runQuery("5000000");
    expect(res.data.events).toHaveLength(1);
    expect(res.data.events[0]?.amount_tao).toBe(5);
    expect(res.data.events[0]?.alpha_amount).toBe(100);
  });

  it("leaves alpha_amount null when the row has no alpha figure (no TAO bleed-through)", async () => {
    resolveWith({
      block_number: 5000000,
      event_count: 1,
      events: [{ event_index: 1, event_kind: "StakeAdded", amount_tao: 7 }],
    });
    const res = await runQuery("5000000");
    expect(res.data.events[0]?.amount_tao).toBe(7);
    expect(res.data.events[0]?.alpha_amount).toBeNull();
  });
});
