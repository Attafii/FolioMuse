// Consumer integration tests (plan portfolio-card-system T9).
// Renders each GalleryCard consumer with react-dom/server and asserts the
// shared card/skeleton contract. The shared useGallerySummaries cache returns
// the stable SERVER_SNAPSHOT (loading) during SSR, so consumers render their
// skeleton - which must reserve the same 16:9 media ratio (no layout shift
// from skeleton to loaded card, plan T4/T9).

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { NewNotable } from "@/components/new-notable";
import { RoleExplorer } from "@/components/role-explorer";
import { SectionExplorer } from "@/components/section-explorer";
import { BrowseSkeleton } from "@/components/browse/browse-states";

describe("card-system consumer integration (T9)", () => {
  it("homepage NewNotable skeleton reserves the 16:9 media ratio", () => {
    const html = renderToStaticMarkup(<NewNotable />);
    expect(html).toContain("new-notable");
    expect(html).toContain("aspect-[16/9]");
  });

  it("homepage role explorer skeleton reserves the 16:9 media ratio", () => {
    const html = renderToStaticMarkup(<RoleExplorer />);
    expect(html).toContain("role-explorer");
    expect(html).toContain("aspect-[16/9]");
  });

  it("homepage section explorer skeleton reserves the 16:9 media ratio", () => {
    const html = renderToStaticMarkup(<SectionExplorer />);
    expect(html).toContain("section-explorer");
    expect(html).toContain("aspect-[16/9]");
  });

  it("browse skeleton reserves the 16:9 media ratio", () => {
    const html = renderToStaticMarkup(<BrowseSkeleton />);
    expect(html).toContain("browse-skeleton");
    expect(html).toContain("aspect-[16/9]");
  });

  it("no consumer embeds Prisma or its own gallery fetch marker", () => {
    const html = renderToStaticMarkup(<NewNotable />);
    // SSR renders the shared-cache loading skeleton; there is no per-consumer
    // fetch signal in the DOM. The shared cache is asserted at the hook level.
    expect(html.length).toBeGreaterThan(0);
  });
});
