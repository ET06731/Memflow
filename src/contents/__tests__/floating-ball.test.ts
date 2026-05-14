import { describe, expect, it } from "vitest"

import { isUrlDisabled } from "../floating-ball"

describe("isUrlDisabled", () => {
  const testUrl = "https://www.example.com/page/subpage"

  it("should return false for empty patterns", () => {
    expect(isUrlDisabled(testUrl, [])).toBe(false)
  })

  it("should return false for null/undefined patterns", () => {
    expect(isUrlDisabled(testUrl, null as any)).toBe(false)
    expect(isUrlDisabled(testUrl, undefined as any)).toBe(false)
  })

  it("should match exact URL", () => {
    expect(isUrlDisabled(testUrl, ["https://www.example.com/page/subpage"])).toBe(true)
  })

  it("should not match non-matching exact URL", () => {
    expect(isUrlDisabled(testUrl, ["https://other.com/page"])).toBe(false)
  })

  it("should match wildcard *domain.com/* pattern", () => {
    expect(isUrlDisabled(testUrl, ["*.example.com/*"])).toBe(true)
  })

  it("should match *domain.com* pattern (substring)", () => {
    expect(isUrlDisabled(testUrl, ["example.com"])).toBe(true)
  })

  it("should not match non-matching wildcard", () => {
    expect(isUrlDisabled(testUrl, ["*.other.com/*"])).toBe(false)
  })

  it("should match wildcard path *domain/path*", () => {
    expect(isUrlDisabled(testUrl, ["*.example.com/page/*"])).toBe(true)
  })

  it("should not match when path doesn't match", () => {
    expect(isUrlDisabled(testUrl, ["*.example.com/other/*"])).toBe(false)
  })

  it("should handle multiple patterns and return true if any matches", () => {
    expect(
      isUrlDisabled(testUrl, [
        "*.other.com/*",
        "*.example.com/*",
        "*.third.com/*"
      ])
    ).toBe(true)
  })

  it("should return false when no patterns match", () => {
    expect(
      isUrlDisabled(testUrl, ["*.other.com/*", "*.another.com/*"])
    ).toBe(false)
  })

  it("should handle invalid patterns gracefully without crashing", () => {
    expect(isUrlDisabled(testUrl, ["["])).toBe(false)
    expect(isUrlDisabled(testUrl, ["\\"])).toBe(false)
    expect(isUrlDisabled(testUrl, [""])).toBe(false)
  })

  it("should match subdomain patterns", () => {
    expect(
      isUrlDisabled("https://sub.example.com/page", ["*.example.com/*"])
    ).toBe(true)
  })

  it("should handle ImmersiveTranslate style patterns", () => {
    expect(
      isUrlDisabled(
        "https://www.immersivetranslate.com/preview",
        ["*.immersivetranslate.*/preview"]
      )
    ).toBe(true)
  })

  it("should not match when ImmersiveTranslate style doesn't match", () => {
    expect(
      isUrlDisabled(
        "https://www.immersivetranslate.com/settings",
        ["*.immersivetranslate.*/preview"]
      )
    ).toBe(false)
  })

  it("should handle simple hostname matching", () => {
    expect(isUrlDisabled("https://example.com", ["example.com"])).toBe(true)
  })

  it("should trim whitespace from patterns", () => {
    expect(isUrlDisabled(testUrl, ["  *.example.com/*  "])).toBe(true)
  })

  it("should skip empty patterns", () => {
    expect(isUrlDisabled(testUrl, ["", "  ", "*.example.com/*"])).toBe(true)
  })
})