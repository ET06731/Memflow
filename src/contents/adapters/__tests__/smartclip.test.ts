import { beforeEach, describe, expect, it } from "vitest"

import { createSmartClipAdapter } from "../smartclip"

describe("SmartClipAdapter", () => {
  beforeEach(() => {
    document.head.innerHTML = ""
    document.body.innerHTML = ""
    window.history.replaceState({}, "", "/post")
    document.title = "测试页面标题"
  })

  it("应该优先提取 article 正文并移除文章尾部噪音", () => {
    document.body.innerHTML = `
      <main>
        <article>
          <h1>产品经理的 AI 工作流</h1>
          <p>这是正文第一段，包含足够多的内容用于评分。</p>
          <p>这是正文第二段，继续说明文章主题和具体做法。</p>
          <section>
            <h2>实践步骤</h2>
            <p>先梳理任务，再选择模型，然后沉淀流程。</p>
          </section>
          <div class="article-footer">
            <button>喜欢作者</button>
            <p>“祝你每天好心情”</p>
            <div class="post-navigation">
              <a href="/prev">上一篇</a>
              <a href="/next">下一篇</a>
            </div>
          </div>
        </article>
        <aside class="recommended">
          <a href="/related">相关文章</a>
        </aside>
      </main>
    `

    const adapter = createSmartClipAdapter()
    const conversation = adapter.extractConversation()
    const content = conversation.messages[0]?.content || ""

    expect(content).toContain("# 产品经理的 AI 工作流")
    expect(content).toContain("这是正文第一段")
    expect(content).toContain("## 实践步骤")
    expect(content).not.toContain("喜欢作者")
    expect(content).not.toContain("祝你每天好心情")
    expect(content).not.toContain("上一篇")
    expect(content).not.toContain("下一篇")
    expect(content).not.toContain("相关文章")
  })

  it("应该整合 og、twitter、json-ld 与发布时间作者信息", () => {
    document.head.innerHTML = `
      <meta property="og:title" content="OG 标题" />
      <meta property="og:description" content="OG 描述" />
      <meta property="og:image" content="/cover.jpg" />
      <meta property="og:site_name" content="Memflow Blog" />
      <meta name="twitter:title" content="Twitter 标题" />
      <meta name="author" content="张三" />
      <meta property="article:published_time" content="2026-05-14T10:00:00.000Z" />
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": "JSON-LD 标题",
          "description": "JSON-LD 描述",
          "image": ["https://example.com/jsonld-cover.jpg"],
          "author": {
            "@type": "Person",
            "name": "李四"
          },
          "publisher": {
            "@type": "Organization",
            "name": "Schema Publisher"
          },
          "datePublished": "2025-01-01T08:00:00.000Z"
        }
      </script>
    `

    document.body.innerHTML = `
      <article>
        <h1>正文标题</h1>
        <p>正文内容。</p>
        <time datetime="2026-05-14T09:30:00.000Z">2026-05-14</time>
        <a rel="author">备用作者</a>
      </article>
    `

    const adapter = createSmartClipAdapter()
    const metadata = adapter.getMetadata()

    expect(metadata.title).toBe("OG 标题")
    expect(metadata.description).toBe("OG 描述")
    expect(metadata.coverImage).toBe(
      `${new URL(window.location.href).origin}/cover.jpg`
    )
    expect(metadata.siteName).toBe("Memflow Blog")
    expect(metadata.author).toBe("张三")
    expect(metadata.publishDate).toBe("2026-05-14T10:00:00.000Z")
  })

  it("应该清理营销拦截层与 javascript 伪链接噪声", () => {
    document.body.innerHTML = `
      <article>
        <h1>真正的正文标题</h1>
        <p>这是一段正常正文，介绍文章主题，并且提供足够多的信息帮助正文评分逻辑识别主要内容区域。</p>
        <p>这里继续补充正文细节，包括背景、方法、案例和结论，让正文长度、段落数和结构都更接近真实文章页面。</p>
        <p>再补充一段正文，确保在出现弹窗文案时，主内容仍然拥有明显更高的有效信息密度。</p>
        <div class="overlay-dialog">
          <p>当前内容可能存在未经审核的第三方商业营销信息，请确认是否继续访问。</p>
          <a href="javascript:;">继续访问</a>
          <a href="javascript:;">取消</a>
          <a href="javascript:;">微信公众平台广告规范指引</a>
          <button>知道了</button>
          <p>微信扫一扫</p>
          <p>使用小程序</p>
          <a href="javascript:void(0);">允许</a>
        </div>
      </article>
    `

    const adapter = createSmartClipAdapter()
    const conversation = adapter.extractConversation()
    const content = conversation.messages[0]?.content || ""

    expect(content).toContain("真正的正文标题")
    expect(content).toContain("这是一段正常正文")
    expect(content).not.toContain("第三方商业营销信息")
    expect(content).not.toContain("继续访问")
    expect(content).not.toContain("微信扫一扫")
    expect(content).not.toContain("允许")
  })
})
