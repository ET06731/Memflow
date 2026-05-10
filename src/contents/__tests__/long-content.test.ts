import { describe, expect, it } from "vitest"

import { buildBilibiliMarkdown, buildYouTubeMarkdown } from "../index"

describe("long content export", () => {
  it("keeps full bilibili subtitles instead of truncating them", () => {
    window.location.href = "https://www.bilibili.com/video/BV1XMFZzAEzR/"

    const subtitles = "字幕".repeat(30010)
    const markdown = buildBilibiliMarkdown(
      {
        title: "长视频测试",
        uploader: "UP主",
        uploaderUrl: "https://space.bilibili.com/1",
        description: "desc",
        tags: ["测试"],
        views: "1万",
        likes: "100",
        coins: "10",
        favorites: "20",
        publishDate: "2026-05-10"
      },
      subtitles
    )

    expect(markdown).toContain(subtitles)
    expect(markdown).not.toContain("字幕过长，已截断")
  })

  it("keeps full youtube subtitles instead of truncating them", () => {
    window.location.href = "https://www.youtube.com/watch?v=test-video"

    const subtitles = "caption ".repeat(8000)
    const markdown = buildYouTubeMarkdown(
      {
        title: "Long Video Test",
        channelName: "Channel",
        channelUrl: "https://www.youtube.com/@channel",
        description: "desc",
        viewCount: "12345",
        likeCount: "678",
        publishDate: "2026-05-10",
        duration: "01:00:00",
        videoId: "test-video"
      },
      subtitles
    )

    expect(markdown).toContain(subtitles)
    expect(markdown).not.toContain("字幕过长，已截断")
  })
})
