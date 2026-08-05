import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

describe("cn()", () => {
  it("merges simple class names", () => {
    expect(cn("a", "b")).toBe("a b")
  })

  it("filters out falsy values", () => {
    expect(cn("a", false, "b")).toBe("a b")
  })

  it("resolves Tailwind class conflicts via tailwind-merge", () => {
    expect(cn("px-2 py-1", "px-2")).toBe("py-1 px-2")
  })
})
