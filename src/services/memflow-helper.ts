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

interface MemflowHelperProgressCallbacks {
  onStageChange?: (message: string) => void
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "")
}

export class MemflowHelperService {
  static async transcribeVideoUrl(
    videoUrl: string,
    config: MemflowHelperConfig,
    language: string = "auto",
    callbacks: MemflowHelperProgressCallbacks = {}
  ): Promise<string> {
    if (!config.enabled) {
      throw new Error("Memflow Helper 未启用")
    }

    const baseUrl = normalizeBaseUrl(config.baseUrl)
    callbacks.onStageChange?.("正在提交本地转写任务...")
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
    callbacks.onStageChange?.(`已创建本地转写任务，任务 ID: ${job.id}`)
    const completedJob = await this.waitForJob(baseUrl, job.id, config, callbacks)
    if (completedJob.status !== "completed") {
      throw new Error(completedJob.error_message || "本地转写任务失败")
    }

    callbacks.onStageChange?.("转写完成，正在读取结果...")
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

    callbacks.onStageChange?.(`正在下载转写结果: ${transcriptFile.name}`)
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
    config: MemflowHelperConfig,
    callbacks: MemflowHelperProgressCallbacks = {}
  ): Promise<HelperJobRecord> {
    const startedAt = Date.now()
    let lastStatus = ""
    while (Date.now() - startedAt < config.timeoutMs) {
      const response = await fetch(`${baseUrl}/jobs/${jobId}`)
      if (!response.ok) {
        throw new Error("轮询本地转写任务失败")
      }
      const job = (await response.json()) as HelperJobRecord
      if (job.status !== lastStatus) {
        lastStatus = job.status
        callbacks.onStageChange?.(
          this.formatJobStatusMessage(job.status, jobId)
        )
      }
      if (["completed", "failed", "cancelled"].includes(job.status)) {
        return job
      }
      await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs))
    }
    throw new Error("等待本地转写超时")
  }

  private static formatJobStatusMessage(status: string, jobId: string): string {
    const statusMap: Record<string, string> = {
      queued: `本地转写排队中，任务 ID: ${jobId}`,
      pending: `本地转写准备中，任务 ID: ${jobId}`,
      running: `本地转写进行中，任务 ID: ${jobId}`,
      completed: `本地转写完成，任务 ID: ${jobId}`,
      failed: `本地转写失败，任务 ID: ${jobId}`,
      cancelled: `本地转写已取消，任务 ID: ${jobId}`
    }

    return statusMap[status] || `本地转写状态更新: ${status}`
  }
}
