"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { BrowseEmpty, BrowseError, BrowseNoResults, BrowseSkeleton } from "@/components/browse/browse-states";
import { FilterBar } from "@/components/browse/filter-bar";
import { FacetGroups } from "@/components/browse/filter-controls";
import { FilterSheet } from "@/components/browse/filter-sheet";
import { ResultsGrid } from "@/components/browse/results-grid";
import { ConsentTierSchema, QualityLevelSchema } from "@/domain/curation/schemas";
import type { FlywheelEventPayload } from "@/domain/flywheel/types";
import {
  useGalleryFacets,
  useGalleryQuery,
} from "@/hooks/use-gallery-query";
import { sectionVisibilityKey, useTelemetry } from "@/hooks/use-telemetry";
import { parseBrowseParams, serializeBrowseState } from "@/lib/browse/browse-params";
import {
  countActiveFilterGroups,
  DEFAULT_BROWSE_STATE,
  type BrowseState,
  type SortKey,
} from "@/lib/browse/browse-types";

/**
 * /browse orchestrator (plan T5, LCP refactor).
 *
 * URL remains the single source of truth for filter state. The difference:
 * filtering/sorting/pagination now execute SERVER-SIDE â€” the explorer
 * serializes BrowseState into an API query and renders the returned page
 * (~30 KB), instead of downloading and filtering the entire corpus.
 *
 * The only local state is the search input DRAFT (300 ms debounce into the
 * URL, which re-triggers the server query) and the mobile sheet's flag.
 * Facet chips come from /api/gallery/facets (server-computed counts).
 *
 * Telemetry unchanged: IMPRESSION per visible item keyed on state signature.
 */

const PAGE_SIZE = 12;

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
  const { impression } = useTelemetry();

  // URL is the single source of truth for the filter state.
  const state = useMemo(() => parseBrowseParams(searchParams), [searchParams]);

  // Server executes the query; total drives pagination.
  const { items, total, loading, error, refetch } = useGalleryQuery({
    q: state.q || undefined,
    role: state.roles.length ? state.roles : undefined,
    style: state.styles.length ? state.styles : undefined,
    quality: state.quality.length ? state.quality : undefined,
    consent: state.consent.length ? state.consent : undefined,
    sort: state.sort,
    page: state.page,
    pageSize: PAGE_SIZE,
  });
  const { facets, loading: facetsLoading } = useGalleryFacets();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasActiveFilters = countActiveFilterGroups(state) > 0;

  // â”€â”€â”€ URL sync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const updateUrl = useCallback(
    (next: BrowseState) => {
      const params = serializeBrowseState(next);
      const qs = params.toString();
      const base = pathname ?? "/browse";
      const href = qs ? `${base}?${qs}` : base;
      router.replace(href, { scroll: false });
    },
    [router, pathname],
  );

  // â”€â”€â”€ Search draft with 300ms debounce (plain setTimeout, no library) â”€â”€â”€â”€
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

  // â”€â”€â”€ Filter/sort/page handlers (each resets page to 1 unless changing page) â”€â”€
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

  // â”€â”€â”€ Telemetry: IMPRESSION per visible item, keyed on state signature â”€â”€â”€
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
    if (loading || error || items.length === 0) return;
    const payload: FlywheelEventPayload = state.q
      ? { source: "browse", query: state.q }
      : { source: "browse" };
    for (const item of items) {
      impression(
        item.id,
        payload,
        sectionVisibilityKey(`browse:${signature}`, item.id),
      );
    }
  }, [items, signature, loading, error, impression, state.q]);

  // â”€â”€â”€ Render composition â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const controlsProps = {
    state,
    facets: facets ?? {
      roles: [],
      styles: [],
      stacks: [],
      qualities: [],
      consents: [],
    },
    resultCount: total,
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
      className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-24 pt-10 sm:px-6 lg:px-8"
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

      {loading && items.length === 0 ? <BrowseSkeleton /> : null}

      {!loading && error ? (
        <BrowseError error={error} onRetry={refetch} />
      ) : null}

      {!loading && !error && total === 0 && !hasActiveFilters && state.q === "" ? (
        <BrowseEmpty />
      ) : null}

      {!loading && !error && !(total === 0 && !hasActiveFilters && state.q === "") ? (
        <>
          <div className="md:hidden">
            <FilterSheet {...controlsProps} />
          </div>

          {/* Slim sticky search/sort bar — facets render below, in flow. */}
          <FilterBar {...controlsProps} />

          <FacetGroups
            state={state}
            facets={facets ?? {
              roles: [],
              styles: [],
              stacks: [],
              qualities: [],
              consents: [],
            }}
            onToggleRole={handleToggleRole}
            onToggleStyle={handleToggleStyle}
            onToggleQuality={handleToggleQuality}
            onToggleConsent={handleToggleConsent}
          />

          {items.length === 0 ? (
            <BrowseNoResults onClearAll={handleClearAll} />
          ) : (
            <ResultsGrid
              pageItems={items}
              totalCount={total}
              page={state.page}
              totalPages={totalPages}
              browseState={state}
              pathname={pathname ?? "/browse"}
              onPageChange={handlePageChange}
            />
          )}
        </>
      ) : null}
    </section>
  );
}
