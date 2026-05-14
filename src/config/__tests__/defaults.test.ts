import { describe, expect, it } from "vitest"

import { getDefaultFloatingBallConfig } from "../defaults"

describe("getDefaultFloatingBallConfig", () => {
  it("should return enableFloatingBall as true", () => {
    const config = getDefaultFloatingBallConfig()
    expect(config.enableFloatingBall).toBe(true)
  })

  it("should return floatingBallClickAction as 'direct'", () => {
    const config = getDefaultFloatingBallConfig()
    expect(config.floatingBallClickAction).toBe("direct")
  })

  it("should return enableFloatingBallQuickPanel as true", () => {
    const config = getDefaultFloatingBallConfig()
    expect(config.enableFloatingBallQuickPanel).toBe(true)
  })

  it("should return hideFloatingBallUntilHover as false", () => {
    const config = getDefaultFloatingBallConfig()
    expect(config.hideFloatingBallUntilHover).toBe(false)
  })

  it("should return empty floatingBallDisabledSites array", () => {
    const config = getDefaultFloatingBallConfig()
    expect(config.floatingBallDisabledSites).toEqual([])
  })

  it("should return floatingBallSide as 'right'", () => {
    const config = getDefaultFloatingBallConfig()
    expect(config.floatingBallSide).toBe("right")
  })
})