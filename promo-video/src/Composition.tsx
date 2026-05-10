import { Audio } from "@remotion/media"
import { Clock, Link, Settings, Zap } from "lucide-react"
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame
} from "remotion"

const fps = 30

const TitleSlide = ({
  text,
  subtitle,
  delay,
  relative = false
}: {
  text: string
  subtitle?: string
  delay: number
  relative?: boolean
}) => {
  const frame = useCurrentFrame()
  const localFrame = Math.max(0, frame - delay)

  const opacity = interpolate(localFrame, [0, 20], [0, 1], {
    extrapolateRight: "clamp"
  })
  const y = interpolate(localFrame, [0, 25], [40, 0], {
    extrapolateRight: "clamp"
  })

  return (
    <div
      style={{
        position: relative ? "relative" : "absolute",
        top: relative ? undefined : "50%",
        left: relative ? undefined : "50%",
        transform: relative
          ? `translateY(${y}px)`
          : `translate(-50%, -50%) translateY(${y}px)`,
        opacity,
        textAlign: "center",
        width: "100%"
      }}>
      <h1
        style={{
          fontSize: "80px",
          fontWeight: 800,
          margin: 0,
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textShadow: "0 4px 40px rgba(245, 158, 11, 0.4)"
        }}>
        {text}
      </h1>
      {subtitle && (
        <p
          style={{
            fontSize: "28px",
            color: "#9ca3af",
            marginTop: "20px",
            fontWeight: 400
          }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

const TimestampDemo = ({ delay }: { delay: number }) => {
  const frame = useCurrentFrame()
  const localFrame = Math.max(0, frame - delay)

  const lines = [
    { time: "00:15", text: "今天我们来聊一聊机器学习..." },
    { time: "01:32", text: "首先，什么是监督学习？..." },
    { time: "03:45", text: "接下来是无监督学习..." },
    { time: "05:20", text: "最后是强化学习的应用..." }
  ]

  const visibleCount = Math.min(4, Math.floor(localFrame / 20))
  const opacity = interpolate(localFrame, [0, 15], [0, 1], {
    extrapolateRight: "clamp"
  })

  return (
    <div
      style={{
        opacity,
        background: "#1a1a2e",
        borderRadius: "12px",
        padding: "24px 32px",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "15px",
        lineHeight: 2,
        border: "1px solid rgba(255, 255, 255, 0.1)",
        minWidth: "600px"
      }}>
      {lines.slice(0, visibleCount).map((line, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: "16px",
            marginBottom: i < visibleCount - 1 ? "8px" : 0
          }}>
          <span style={{ color: "#f59e0b", flexShrink: 0 }}>[{line.time}]</span>
          <span style={{ color: "#e5e7eb" }}>{line.text}</span>
        </div>
      ))}
    </div>
  )
}

const ProgressDemo = ({ delay }: { delay: number }) => {
  const frame = useCurrentFrame()
  const localFrame = Math.max(0, frame - delay)

  const steps = [
    { icon: "📥", text: "提取字幕中...", active: localFrame < 35 },
    {
      icon: "🤖",
      text: "AI 分析中...",
      active: localFrame >= 35 && localFrame < 70
    },
    { icon: "💾", text: "导出文件中...", active: localFrame >= 70 }
  ]

  const opacity = interpolate(localFrame, [0, 15], [0, 1], {
    extrapolateRight: "clamp"
  })

  return (
    <div
      style={{
        opacity,
        background: "rgba(10, 10, 15, 0.95)",
        borderRadius: "12px",
        padding: "24px 36px",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        backdropFilter: "blur(20px)",
        minWidth: "280px"
      }}>
      <div
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "#fff",
          marginBottom: "16px",
          textAlign: "center"
        }}>
        🎬 视频总结进度
      </div>
      {steps.map((step, i) => {
        const stepDone =
          (i === 0 && localFrame >= 30) ||
          (i === 1 && localFrame >= 65) ||
          (i === 2 && localFrame >= 95)
        const stepActive =
          (i === 0 && localFrame < 30) ||
          (i === 1 && localFrame >= 30 && localFrame < 65) ||
          (i === 2 && localFrame >= 65)

        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "12px",
              color: stepDone
                ? "#10b981"
                : stepActive
                  ? "#fff"
                  : "rgba(255,255,255,0.4)",
              fontSize: "14px"
            }}>
            <span
              style={{ fontSize: "18px", width: "24px", textAlign: "center" }}>
              {stepDone ? "✓" : step.icon}
            </span>
            <span>{step.text}</span>
          </div>
        )
      })}
    </div>
  )
}

const PopupDemo = ({ delay }: { delay: number }) => {
  const frame = useCurrentFrame()
  const localFrame = Math.max(0, frame - delay)

  const opacity = interpolate(localFrame, [0, 20], [0, 1], {
    extrapolateRight: "clamp"
  })
  const scale = interpolate(localFrame, [0, 20], [0.85, 1], {
    extrapolateRight: "clamp"
  })

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        background:
          "linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0d0d12 100%)",
        borderRadius: "16px",
        padding: "20px",
        width: "300px",
        border: "1px solid rgba(245, 158, 11, 0.2)",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)"
      }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px"
        }}>
        <span
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "16px",
            fontWeight: 600,
            color: "#f59e0b"
          }}>
          MemFlow
        </span>
      </div>

      <div
        style={{
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          borderRadius: "10px",
          padding: "12px",
          textAlign: "center",
          fontSize: "14px",
          fontWeight: 600,
          color: "#000",
          marginBottom: "8px"
        }}>
        立即导出
      </div>

      <div
        style={{
          background: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
          borderRadius: "10px",
          padding: "12px",
          textAlign: "center",
          fontSize: "14px",
          fontWeight: 600,
          color: "#fff",
          marginBottom: "12px"
        }}>
        智能导出
      </div>

      <div
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          borderRadius: "8px",
          padding: "12px",
          border: "1px solid rgba(255, 255, 255, 0.08)"
        }}>
        <div style={{ fontSize: "12px", color: "#888", marginBottom: "10px" }}>
          总结风格: 💻 科技
        </div>

        <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
          {["💻", "📚", "🔥", "📰", "✏️"].map((e, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                padding: "8px 2px",
                background:
                  i === 0
                    ? "rgba(245, 158, 11, 0.2)"
                    : "rgba(255, 255, 255, 0.05)",
                borderRadius: "6px",
                fontSize: "12px",
                textAlign: "center",
                border:
                  i === 0
                    ? "1px solid #f59e0b"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                color: i === 0 ? "#f59e0b" : "#666"
              }}>
              {e}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "6px"
          }}>
          <input
            type="checkbox"
            defaultChecked
            style={{ accentColor: "#f59e0b", width: "14px", height: "14px" }}
          />
          <span style={{ fontSize: "12px", color: "#aaa" }}>包含字幕原文</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            defaultChecked
            style={{ accentColor: "#f59e0b", width: "14px", height: "14px" }}
          />
          <span style={{ fontSize: "12px", color: "#aaa" }}>包含时间戳</span>
        </div>
      </div>
    </div>
  )
}

const FeatureCard = ({
  icon,
  title,
  desc,
  delay
}: {
  icon: React.ReactNode
  title: string
  desc: string
  delay: number
}) => {
  const frame = useCurrentFrame()
  const localFrame = Math.max(0, frame - delay)

  const opacity = interpolate(localFrame, [0, 20], [0, 1], {
    extrapolateRight: "clamp"
  })
  const y = interpolate(localFrame, [0, 25], [50, 0], {
    extrapolateRight: "clamp"
  })

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        background: "rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(20px)",
        borderRadius: "16px",
        padding: "28px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        display: "flex",
        alignItems: "flex-start",
        gap: "20px",
        minWidth: "260px"
      }}>
      <div
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "12px",
          background:
            "linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }}>
        {icon}
      </div>
      <div>
        <h3
          style={{
            fontSize: "20px",
            fontWeight: 700,
            margin: "0 0 8px 0",
            color: "#fff"
          }}>
          {title}
        </h3>
        <p
          style={{
            fontSize: "14px",
            color: "#9ca3af",
            margin: 0,
            lineHeight: 1.5
          }}>
          {desc}
        </p>
      </div>
    </div>
  )
}

const BackgroundGlow = () => (
  <div
    style={{
      position: "absolute",
      top: "-30%",
      right: "-20%",
      width: "80%",
      height: "80%",
      background:
        "radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 60%)",
      filter: "blur(100px)",
      pointerEvents: "none"
    }}
  />
)

export const MainComposition = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f0f12",
        color: "white",
        overflow: "hidden"
      }}>
      <BackgroundGlow />

      <Sequence from={0} durationInFrames={90}>
        <AbsoluteFill
          style={{ justifyContent: "center", alignItems: "center" }}>
          <TitleSlide
            text="Memflow v1.1.0"
            subtitle="B站视频导出功能升级"
            delay={0}
          />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={90} durationInFrames={150}>
        <AbsoluteFill
          style={{ justifyContent: "center", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "32px"
            }}>
            <TitleSlide
              text="可点击时间戳"
              subtitle="点击跳转到视频对应位置"
              delay={0}
              relative
            />
            <TimestampDemo delay={40} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#888",
                fontSize: "14px",
                marginTop: "8px"
              }}>
              <Link size={16} color="#f59e0b" />
              <span>自动生成 B站 视频时间链接</span>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={240} durationInFrames={150}>
        <AbsoluteFill
          style={{ justifyContent: "center", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "32px"
            }}>
            <TitleSlide
              text="实时进度提示"
              subtitle="导出过程一目了然"
              delay={0}
              relative
            />
            <ProgressDemo delay={40} />
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={390} durationInFrames={180}>
        <AbsoluteFill
          style={{ justifyContent: "center", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "32px"
            }}>
            <TitleSlide
              text="快捷模板配置"
              subtitle="Popup 内直接调整导出设置"
              delay={0}
              relative
            />
            <PopupDemo delay={40} />
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={570} durationInFrames={150}>
        <AbsoluteFill
          style={{ justifyContent: "center", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "32px"
            }}>
            <TitleSlide text="更多功能" delay={0} relative />
            <div
              style={{
                display: "flex",
                gap: "24px",
                flexWrap: "wrap",
                justifyContent: "center"
              }}>
              <FeatureCard
                icon={<Clock size={26} color="#f59e0b" />}
                title="时间戳跳转"
                desc="可点击跳转到视频任意位置"
                delay={30}
              />
              <FeatureCard
                icon={<Zap size={26} color="#f59e0b" />}
                title="实时进度"
                desc="导出过程清晰可见"
                delay={50}
              />
              <FeatureCard
                icon={<Settings size={26} color="#f59e0b" />}
                title="快捷配置"
                desc="Popup 内直接调整模板"
                delay={70}
              />
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={720} durationInFrames={90}>
        <AbsoluteFill
          style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <h1
              style={{
                fontSize: "72px",
                fontWeight: 800,
                margin: 0,
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}>
              立即体验
            </h1>
            <p
              style={{ fontSize: "24px", color: "#9ca3af", marginTop: "24px" }}>
              github.com/ET06731/Memflow
            </p>
          </div>
        </AbsoluteFill>
      </Sequence>

      <Audio
        src={staticFile("background.mp3")}
        volume={(f) =>
          interpolate(f, [0, 30, 780], [0, 0.3, 0.3], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp"
          })
        }
      />
    </AbsoluteFill>
  )
}
