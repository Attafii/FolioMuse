"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Compass, Heart, LayoutTemplate, LucideIcon, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Tubelight navbar (21st.dev pattern, adapted for the Next.js App Router).
 *
 * Adaptations from the stock snippet:
 * - Active tab derives from usePathname() (URL is the source of truth), so
 *   back/forward and direct links highlight correctly â€” not just clicks.
 * - Optional `rightSlot` renders inside the pill (FolioMuse mounts the theme
 *   toggle there) so the site keeps exactly ONE floating element.
 * - Mobile: bottom docked bar; >=768px: floating top pill.
 */

interface NavItem {
  name: string
  url: string
  icon: LucideIcon
}


/** FolioMuse primary nav — defined client-side so lucide icon components
 * never cross the server->client component boundary (functions are not
 * serializable as props). */
export const NAV_ITEMS: NavItem[] = [
  { name: "Home", url: "/", icon: Sparkles },
  { name: "Browse", url: "/browse", icon: Compass },
  { name: "Sections", url: "/sections", icon: LayoutTemplate },
  { name: "Liked", url: "/liked", icon: Heart },
];
interface NavBarProps {
  items?: NavItem[]
  className?: string
  rightSlot?: React.ReactNode
}

function isActivePath(pathname: string, url: string): boolean {
  if (url === "/") return pathname === "/"
  return pathname === url || pathname.startsWith(`${url}/`)
}

export function NavBar({ items = NAV_ITEMS, className, rightSlot }: NavBarProps) {
  const pathname = usePathname()
  const activeItem =
    items.find((item) => isActivePath(pathname, item.url)) ?? items[0]
  const [clicked, setClicked] = useState<string | null>(null)

  // Optimistic click feedback; URL remains authoritative on navigation.
  const activeTab = clicked ?? activeItem.name

  return (
    <div
      className={cn(
        "fixed bottom-4 sm:top-4 sm:bottom-auto left-1/2 -translate-x-1/2 z-[60] pointer-events-none",
        className,
      )}
    >
      <nav
        aria-label="Primary"
        className="pointer-events-auto flex items-center gap-1 bg-background/70 border border-border/80 backdrop-blur-xl py-1.5 px-1.5 rounded-full shadow-lg shadow-black/10 dark:shadow-black/40"
      >
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.name

          return (
            <Link
              key={item.name}
              href={item.url}
              onClick={() => setClicked(item.name)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative cursor-pointer text-sm font-medium px-4 py-2 rounded-full transition-colors select-none",
                "text-muted-foreground hover:text-foreground",
                isActive && "text-primary",
              )}
            >
              <span className="hidden md:inline">{item.name}</span>
              <span className="md:hidden" aria-hidden>
                <Icon size={18} strokeWidth={2} />
              </span>
              <span className="sr-only md:hidden">{item.name}</span>
              {isActive && (
                <motion.div
                  layoutId="tubelight-lamp"
                  className="absolute inset-0 w-full rounded-full -z-10"
                  initial={false}
                  transition={{ type: "spring", stiffness: 320, damping: 30 }}
                >
                  <div className="absolute inset-0 bg-accent rounded-full" />
                  {/* Tubelight bloom on the top edge (desktop) / top of dock */}
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-px bg-primary">
                    <div className="absolute w-12 h-6 bg-primary/25 blur-md -top-2 -left-2" />
                    <div className="absolute w-8 h-6 bg-primary/20 blur-md -top-1 left-0" />
                    <div className="absolute w-4 h-4 bg-primary/20 blur-sm top-0 left-2" />
                  </div>
                </motion.div>
              )}
            </Link>
          )
        })}

        {rightSlot ? (
          <>
            <span aria-hidden className="mx-1 h-5 w-px bg-border" />
            {rightSlot}
          </>
        ) : null}
      </nav>
    </div>
  )
}
