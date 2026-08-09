import { describe, it, expect } from "vitest";

import {
  parseBrowseParams,
  serializeBrowseState,
} from "@/lib/browse/browse-params";
import {
  countActiveFilterGroups,
  DEFAULT_BROWSE_STATE,
  type BrowseState,
} from "@/lib/browse/browse-types";

const FULL_STATE: BrowseState = {
  q: "editorial",
  roles: ["Product Designer", "Developer"],
  styles: ["Minimal", "Editorial"],
  quality: ["L2", "L4"],
  consent: ["FULL"],
  sort: "title-asc",
  page: 3,
};

describe("parseBrowseParams", () => {
  it("returns all defaults for empty input", () => {
    expect(parseBrowseParams(new URLSearchParams())).toEqual(DEFAULT_BROWSE_STATE);
    expect(parseBrowseParams({})).toEqual(DEFAULT_BROWSE_STATE);
  });

  it("reads repeated params into arrays", () => {
    const state = parseBrowseParams(new URLSearchParams("role=Designer&role=Developer"));
    expect(state.roles).toEqual(["Designer", "Developer"]);
  });

  it("degrades gracefully on garbage input", () => {
    const state = parseBrowseParams(new URLSearchParams("role=!!x&&&page=0&sort=bogus&q="));
    expect(state.roles).toEqual([]);
    expect(state.page).toBe(1);
    expect(state.sort).toBe("newest");
    expect(state.q).toBe("");
  });

  it("preserves values as-provided (no lowercasing here)", () => {
    const state = parseBrowseParams(
      new URLSearchParams("role=Product+Designer&style=minimal&sort=title-asc"),
    );
    expect(state.roles).toEqual(["Product Designer"]);
    expect(state.styles).toEqual(["minimal"]);
    expect(state.sort).toBe("title-asc");
  });

  it("drops invalid enum values but keeps valid ones", () => {
    const state = parseBrowseParams(
      new URLSearchParams("quality=L2&quality=BOGUS&consent=FULL&consent=NOPE"),
    );
    expect(state.quality).toEqual(["L2"]);
    expect(state.consent).toEqual(["FULL"]);
  });

  it("ignores empty string params", () => {
    const state = parseBrowseParams(new URLSearchParams("role=&style=&q="));
    expect(state.roles).toEqual([]);
    expect(state.styles).toEqual([]);
    expect(state.q).toBe("");
  });
});

describe("serializeBrowseState", () => {
  it("omits all defaults (empty URL string)", () => {
    expect(serializeBrowseState(DEFAULT_BROWSE_STATE).toString()).toBe("");
  });

  it("round-trips a fully populated state", () => {
    const serialized = serializeBrowseState(FULL_STATE);
    expect(parseBrowseParams(serialized)).toEqual(FULL_STATE);
  });

  it("emits repeated params for multi-select facets", () => {
    const params = serializeBrowseState({ ...DEFAULT_BROWSE_STATE, roles: ["Designer", "Developer"] });
    expect(params.getAll("role")).toEqual(["Designer", "Developer"]);
  });

  it("emits keys in deterministic order: q, roles, styles, quality, consent, sort, page", () => {
    const params = serializeBrowseState(FULL_STATE);
    const keys = [...params.keys()];
    expect(keys).toEqual([
      "q",
      "role",
      "role",
      "style",
      "style",
      "quality",
      "quality",
      "consent",
      "sort",
      "page",
    ]);
  });

  it("omits default page and sort values", () => {
    const params = serializeBrowseState({ ...DEFAULT_BROWSE_STATE, q: "x" });
    expect(params.toString()).toBe("q=x");
  });
});

describe("countActiveFilterGroups", () => {
  it("is 0 for the default state", () => {
    expect(countActiveFilterGroups(DEFAULT_BROWSE_STATE)).toBe(0);
  });

  it("counts each constrained group once (multi-select facet = 1 group)", () => {
    expect(countActiveFilterGroups(FULL_STATE)).toBe(6);
  });

  it("counts a single search query", () => {
    expect(countActiveFilterGroups({ ...DEFAULT_BROWSE_STATE, q: "x" })).toBe(1);
  });
});
