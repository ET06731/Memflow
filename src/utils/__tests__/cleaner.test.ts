import { describe, expect, it } from "vitest"

import { stripHtml } from "../cleaner"

describe("stripHtml", () => {
  it("应该移除 HTML 标签", () => {
    const html = "<p>Hello World</p>"
    expect(stripHtml(html)).toBe("Hello World")
  })

  it("应该处理嵌套标签", () => {
    const html = "<div><p>Hello <strong>World</strong></p></div>"
    expect(stripHtml(html)).toBe("Hello World")
  })

  it("应该将块级标签转换为换行", () => {
    const html = "<p>Line 1</p><p>Line 2</p>"
    const result = stripHtml(html)
    expect(result).toContain("Line 1")
    expect(result).toContain("Line 2")
  })

  it("应该解码 HTML 实体", () => {
    const html = "Hello&nbsp;World &amp; Test"
    expect(stripHtml(html)).toBe("Hello World & Test")
  })

  it("应该处理空字符串", () => {
    expect(stripHtml("")).toBe("")
  })

  it("应该处理 undefined/null", () => {
    expect(stripHtml(undefined as any)).toBe("")
    expect(stripHtml(null as any)).toBe("")
  })

  it("应该清理多余的空白", () => {
    const html = "<p>Text    with    spaces</p>"
    expect(stripHtml(html)).toBe("Text with spaces")
  })
})
