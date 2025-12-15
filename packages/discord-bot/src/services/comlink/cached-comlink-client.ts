import { container } from "@sapphire/pieces"
import { ComlinkGuildData, ComlinkPlayerData } from "@swgoh-utils/comlink"
import { CacheService } from "../cache-service"

export class CachedComlinkClient {
  private static instance: CachedComlinkClient
  private cache: CacheService
  private static readonly MAX_RETRIES = 3
  private static readonly BASE_DELAY = 1000 // 1 second

  private constructor() {
    this.cache = CacheService.getInstance()
  }

  public static getInstance(): CachedComlinkClient {
    if (!CachedComlinkClient.instance) {
      CachedComlinkClient.instance = new CachedComlinkClient()
    }
    return CachedComlinkClient.instance
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    for (let attempt = 0; attempt <= CachedComlinkClient.MAX_RETRIES; attempt++) {
      try {
        return await operation()
      } catch (error: unknown) {
        const errorObj = error as {
          code?: string
          response?: { statusCode?: number }
          statusCode?: number
          message?: string
        }

        const statusCode =
          errorObj?.response?.statusCode ||
          errorObj?.statusCode ||
          (errorObj?.message?.includes("503") ? 503 : null) ||
          (errorObj?.message?.includes("502") ? 502 : null) ||
          (errorObj?.message?.includes("504") ? 504 : null) ||
          (errorObj?.message?.includes("429") ? 429 : null)

        const isTransientError =
          errorObj?.code === "ERR_NON_2XX_3XX_RESPONSE" &&
          (statusCode === 503 ||
            statusCode === 502 ||
            statusCode === 504 ||
            statusCode === 429)

        if (isTransientError && attempt < CachedComlinkClient.MAX_RETRIES) {
          const delay =
            CachedComlinkClient.BASE_DELAY * Math.pow(2, attempt) // Exponential backoff
          console.warn(
            `Transient error (${statusCode}) in ${operationName} (attempt ${attempt + 1}/${CachedComlinkClient.MAX_RETRIES + 1}). Retrying in ${delay}ms...`,
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }

        // If it's not a transient error or we've exhausted retries, throw
        throw error
      }
    }

    // This should never be reached, but TypeScript needs it
    throw new Error(`Failed ${operationName} after ${CachedComlinkClient.MAX_RETRIES + 1} attempts`)
  }

  public async getGuild(
    guildId: string,
    includeActivity: boolean,
  ): Promise<ComlinkGuildData | null> {
    const cacheKey = `guild:${guildId}:${includeActivity}`
    return this.cache.getOrSet(
      cacheKey,
      () =>
        this.retryWithBackoff(
          () => container.comlinkClient.getGuild(guildId, includeActivity),
          `getGuild(${guildId})`,
        ),
    )
  }

  public async getPlayer(allyCode: string): Promise<ComlinkPlayerData | null> {
    const cacheKey = `player:${allyCode}`
    return this.cache.getOrSet(
      cacheKey,
      () =>
        this.retryWithBackoff(
          () => container.comlinkClient.getPlayer(allyCode),
          `getPlayer(${allyCode})`,
        ),
    )
  }
}
