"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { BrowseEmpty, BrowseError, BrowseNoResults, BrowseSkeleton } from "@/components/browse/browse-states";
import { FilterBar } from "@/components/browse/filter-bar";
import { FilterSheet } from "@/components/browse/filter-sheet";
import { ResultsGrid } from "@/components/browse/results-grid";
import { ConsentTierSchema, QualityLevelSchema } from "@/domain/curation/schemas";
import type { FlywheelEventPayload } from "@/domain/flywheel/types";
import { useGallerySummaries } from "@/hooks/use-gallery-summaries";
import { sectionVisibilityKey, useTelemetry } from "@/hooks/use-telemetry";
import { deriveFacets } from "@/lib/browse/browse-facets";
import { filterItems } from "@/lib/browse/browse-filter";
import { paginateItems } from "@/lib/browse/browse-paginate";
import { parseBrowseParams, serializeBrowseState } from "@/lib/browse/browse-params";
import { sortItems } from "@/lib/browse/browse-sort";
import {
  countActiveFilterGroups,
  DEFAULT_BROWSE_STATE,
  type BrowseState,
  type SortKey,
} from "@/lib/browse/browse-types";

/**
 * /browse orchestrator (plan T5).
 *
 * URL is the single source of truth: every filter/sort/page change is
 * serialized into searchParams via router.replace (replace, not push, so
 * back never steps through each keystroke/filter). Filtering, sorting,
 * facets, and pagination all derive from `state` parsed off the URL - there
 * is no local mirror of filter state.
 *
 * The only local state is the search input DRAFT (a typing buffer committed
 * to the URL after a 300ms debounce) and the mobile sheet's open flag.
 *
 * Data comes from the shared useGallerySummaries cache - no new fetch, no
 * server fetch, no direct API calls (plan T5 MUST NOT).
 *
 * Telemetry (plan T5): on filter/sort/page change, fire IMPRESSION per
 * visible page item with a deterministic idempotency key derived from
 * (source, itemId, state-signature) so repeat navigations to the same URL
 * never double-record. Payload stays within the validated flywheel shape:
 * { source: "browse" } plus { query } when search is active (ADR-0004).
 * OPEN events are out of scope - GalleryCard has no open wiring and is not
 * modified (plan T5 note).
 */

/** Toggle a value in a list, case-insensitively (OR within facet). */
function toggleValue<T extends string>(list: T[], value: T): T[] {
  const has = list.some((v) => v.toLowerCase() === value.toLowerCase());
  if (has) return list.filter((v) => v.toLowerCase() !== value.toLowerCase());
  return [...list, value];
}

export function BrowseExplorer() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { items, loading, error, refetch } = useGallerySummaries();
  const { impression } = useTelemetry();

  // URL is the single source of truth for the filter state.
  const state = useMemo(() => parseBrowseParams(searchParams), [searchParams]);

  // Derived pipeline (all pure, from Task 1-3 libs).
  const filtered = useMemo(
    () => sortItems(filterItems(items, state), state),
    [items, state],
  );
  const facets = useMemo(() => deriveFacets(items), [items]);
  const { pageItems, totalPages, totalCount, page } = useMemo(
    () => paginateItems(filtered, state.page),
    [filtered, state.page],
  );

  const hasActiveFilters = countActiveFilterGroups(state) > 0;

  // ─── URL sync ───────────────────────────────────────────────────────────
  const updateUrl = useCallback(
    (next: BrowseState) => {
      const params = serializeBrowseState(next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  // ─── Search draft with 300ms debounce (plain setTimeout, no library) ────
  const [searchDraft, setSearchDraft] = useState(() => state.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the draft in sync when the URL changes externally (clear all,
  // back/forward, direct link with q). Adjusted during render (not in an
  // effect) so the URL stays the single source of truth for the committed
  // query while typing uses the draft as a transient buffer.
  const [prevQ, setPrevQ] = useState(state.q);
  if (prevQ !== state.q) {
    setPrevQ(state.q);
    setSearchDraft(state.q);
  }

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchDraft(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateUrl({ ...state, q: value.trim(), page: 1 });
      }, 300);
    },
    [state, updateUrl],
  );

  // ─── Filter/sort/page handlers (each resets page to 1 unless changing page) ──
  const handleToggleRole = useCallback(
    (value: string) =>
      updateUrl({ ...state, roles: toggleValue(state.roles, value), page: 1 }),
    [state, updateUrl],
  );
  const handleToggleStyle = useCallback(
    (value: string) =>
      updateUrl({ ...state, styles: toggleValue(state.styles, value), page: 1 }),
    [state, updateUrl],
  );
  const handleToggleQuality = useCallback(
    (value: string) => {
      const parsed = QualityLevelSchema.safeParse(value);
      if (!parsed.success) return;
      updateUrl({
        ...state,
        quality: toggleValue(state.quality, parsed.data),
        page: 1,
      });
    },
    [state, updateUrl],
  );
  const handleToggleConsent = useCallback(
    (value: string) => {
      const parsed = ConsentTierSchema.safeParse(value);
      if (!parsed.success) return;
      updateUrl({
        ...state,
        consent: toggleValue(state.consent, parsed.data),
        page: 1,
      });
    },
    [state, updateUrl],
  );
  const handleSortChange = useCallback(
    (key: SortKey) => updateUrl({ ...state, sort: key, page: 1 }),
    [state, updateUrl],
  );
  const handlePageChange = useCallback(
    (nextPage: number) => updateUrl({ ...state, page: nextPage }),
    [state, updateUrl],
  );
  const handleClearAll = useCallback(
    () => updateUrl({ ...DEFAULT_BROWSE_STATE }),
    [updateUrl],
  );

  // ─── Telemetry: IMPRESSION per visible item, keyed on state signature ───
  const signature = useMemo(() => {
    const sorted = (arr: string[]) => [...arr].sort().join(",");
    return [
      state.q,
      sorted(state.roles),
      sorted(state.styles),
      sorted(state.quality),
      sorted(state.consent),
      state.sort,
      String(state.page),
    ].join("|");
  }, [state]);

  useEffect(() => {
    if (loading || error || pageItems.length === 0) return;
    const payload: FlywheelEventPayload = state.q
      ? { source: "browse", query: state.q }
      : { source: "browse" };
    for (const item of pageItems) {
      impression(
        item.id,
        payload,
        sectionVisibilityKey(`browse:${signature}`, item.id),
      );
    }
  }, [pageItems, signature, loading, error, impression, state.q]);

  // ─── Render composition (states delegate to Task 8 views) ───────────────
  const controlsProps = {
    state,
    facets,
    resultCount: totalCount,
    searchValue: searchDraft,
    hasActiveFilters,
    onSearchChange: handleSearchChange,
    onToggleRole: handleToggleRole,
    onToggleStyle: handleToggleStyle,
    onToggleQuality: handleToggleQuality,
    onToggleConsent: handleToggleConsent,
    onSortChange: handleSortChange,
    onClearAll: handleClearAll,
  };

  return (
    <section
      aria-labelledby="browse-heading"
      data-testid="browse-explorer"
      className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-24 pt-12 sm:px-6 lg:px-8"
    >
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Browse
        </p>
        <h1
          id="browse-heading"
          className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          Browse portfolios
        </h1>
        <p className="max-w-[65ch] text-base leading-relaxed text-muted-foreground">
          Filter the gallery by role, style, quality, and consent. Share any
          view by copying the URL.
        </p>
      </header>

      {loading ? <BrowseSkeleton /> : null}

      {!loading && error ? (
        <BrowseError error={error} onRetry={refetch} />
      ) : null}

      {!loading && !error && items.length === 0 ? <BrowseEmpty /> : null}

      {!loading && !error && items.length > 0 ? (
        <>
          <FilterBar {...controlsProps} />

          <div className="md:hidden">
            <FilterSheet {...controlsProps} />
          </div>

          {pageItems.length === 0 ? (
            <BrowseNoResults onClearAll={handleClearAll} />
          ) : (
            <ResultsGrid
              pageItems={pageItems}
              totalCount={totalCount}
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      ) : null}
    </section>
  );
}
