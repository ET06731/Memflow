import type { MemflowHelperConfig } from "../types"

interface HelperJobRecord {
  id: string
  status: string
  result_path?: string | null
  error_message?: string | null
}

interface HelperOutputFile {
  name: string
  size_bytes: number
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "")
}

export class MemflowHelperService {
  static async transcribeVideoUrl(
    videoUrl: string,
    config: MemflowHelperConfig,
    language: string = "auto"
  ): Promise<string> {
    if (!config.enabled) {
      throw new Error("Memflow Helper 未启用")
    }

    const baseUrl = normalizeBaseUrl(config.baseUrl)
    const createResponse = await fetch(`${baseUrl}/jobs/url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: videoUrl,
        language,
        asr_provider: config.asrProvider,
        asr_model: config.asrModel
      })
    })

    if (!createResponse.ok) {
      throw new Error(`创建本地转写任务失败: ${createResponse.status}`)
    }

    const job = (await createResponse.json()) as HelperJobRecord
    const completedJob = await this.waitForJob(baseUrl, job.id, config)
    if (completedJob.status !== "completed") {
      throw new Error(completedJob.error_message || "本地转写任务失败")
    }

    const outputsResponse = await fetch(`${baseUrl}/jobs/${job.id}/outputs`)
    if (!outputsResponse.ok) {
      throw new Error("读取本地转写结果失败")
    }
    const outputs = (await outputsResponse.json()) as HelperOutputFile[]
    const transcriptFile =
      outputs.find((item) => item.name === "transcript.txt") ||
      outputs.find((item) => item.name === "transcript.md") ||
      outputs[0]

    if (!transcriptFile) {
      throw new Error("未找到本地转写输出文件")
    }

    const transcriptResponse = await fetch(
      `${baseUrl}/jobs/${job.id}/outputs/${encodeURIComponent(transcriptFile.name)}`
    )
    if (!transcriptResponse.ok) {
      throw new Error("下载本地转写结果失败")
    }
    return transcriptResponse.text()
  }

  static async health(baseUrl: string): Promise<any> {
    const response = await fetch(`${normalizeBaseUrl(baseUrl)}/health`)
    if (!response.ok) {
      throw new Error(`Memflow Helper health check failed: ${response.status}`)
    }
    return response.json()
  }

  private static async waitForJob(
    baseUrl: string,
    jobId: string,
    config: MemflowHelperConfig
  ): Promise<HelperJobRecord> {
    const startedAt = Date.now()
    while (Date.now() - startedAt < config.timeoutMs) {
      const response = await fetch(`${baseUrl}/jobs/${jobId}`)
      if (!response.ok) {
        throw new Error("轮询本地转写任务失败")
      }
      const job = (await response.json()) as HelperJobRecord
      if (["completed", "failed", "cancelled"].includes(job.status)) {
        return job
      }
      await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs))
    }
    throw new Error("等待本地转写超时")
  }
}
