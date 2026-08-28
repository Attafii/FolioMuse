import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Breadcrumb navigation component.
 *
 * - Structured data for SEO
 * - Accessible with aria-label
 * - Responsive: hides intermediate items on mobile
 */

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol
        itemScope
        itemType="https://schema.org/BreadcrumbList"
        className="flex flex-wrap items-center gap-1.5 text-sm"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={item.label}
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
              className="flex items-center gap-1.5"
            >
              {index > 0 && (
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-muted-foreground"
                />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  itemProp="item"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span itemProp="name">{item.label}</span>
                </Link>
              ) : (
                <span
                  itemProp="name"
                  className={isLast ? "text-foreground font-medium" : "text-muted-foreground"}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              <meta itemProp="position" content={String(index + 1)} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
