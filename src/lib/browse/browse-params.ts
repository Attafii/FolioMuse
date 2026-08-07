import { z } from "zod";

import { ConsentTierSchema, QualityLevelSchema } from "@/domain/curation/schemas";
import { DEFAULT_BROWSE_STATE, type BrowseState, type SortKey } from "@/lib/browse/browse-types";

const sortSchema = z.enum(["newest", "title-asc", "title-desc", "quality"]);

const qualitySchema = QualityLevelSchema;
const consentSchema = ConsentTierSchema;

/**
 * Tolerant parse of URL search params into a valid BrowseState.
 *
 * - Unknown keys are dropped.
 * - Invalid enum values are dropped per-facet (valid ones kept).
 * - page is clamped to >= 1 (NaN/<=0 -> 1).
 * - sort falls back to "newest" on invalid.
 * - Empty string params are ignored.
 */
export function parseBrowseParams(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): BrowseState {
  const params = input instanceof URLSearchParams ? input : fromRecord(input);

  const readRepeated = (key: string): string[] =>
    params
      .getAll(key)
      .map((v) => v.trim())
      .filter((v) => v.length > 0 && isSaneFacetValue(v));

  const readEnum = <T extends z.ZodType>(key: string, schema: T): z.infer<T>[] => {
    const out: z.infer<T>[] = [];
    for (const raw of params.getAll(key)) {
      const parsed = schema.safeParse(raw.trim());
      if (parsed.success) out.push(parsed.data);
    }
    return out;
  };

  const q = params.get("q")?.trim() ?? "";

  const sortRaw = params.get("sort")?.trim() ?? "";
  const sortParsed = sortSchema.safeParse(sortRaw);
  const sort: SortKey = sortParsed.success ? sortParsed.data : "newest";

  const pageRaw = Number.parseInt(params.get("page") ?? "", 10);
  const page = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;

  return {
    q,
    roles: readRepeated("role"),
    styles: readRepeated("style"),
    quality: readEnum("quality", qualitySchema),
    consent: readEnum("consent", consentSchema),
    sort,
    page,
  };
}

/**
 * Serialize a BrowseState back to URLSearchParams.
 *
 * - Only NON-default values are emitted (no q= when empty, no page=1,
 *   no sort=newest, no empty arrays).
 * - Deterministic key order: q, role, style, quality, consent, sort, page.
 * - Multi-select facets emit repeated params so parse(serialize(state)) == state.
 */
export function serializeBrowseState(state: BrowseState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.q) params.set("q", state.q);

  for (const role of state.roles) params.append("role", role);
  for (const style of state.styles) params.append("style", style);
  for (const level of state.quality) params.append("quality", level);
  for (const tier of state.consent) params.append("consent", tier);

  if (state.sort !== DEFAULT_BROWSE_STATE.sort) params.set("sort", state.sort);
  if (state.page !== DEFAULT_BROWSE_STATE.page) params.set("page", String(state.page));

  return params;
}

/** Convert a flat record (Next searchParams shape) to URLSearchParams. */
function fromRecord(
  input: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) {
      params.append(key, v);
    }
  }
  return params;
}

/**
 * Facet values are free-form strings, but garbage (e.g. "!!x") should never
 * reach the filter pipeline. Reject values made of anything other than
 * word characters, spaces, and common typography so malformed params
 * degrade to "no constraint" instead of polluting facets.
 */
function isSaneFacetValue(value: string): boolean {
  return /^[\p{L}\p{N} _\-'.,&()#+/]+$/u.test(value);
}
