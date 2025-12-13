import { CacheService } from "../cache-service"
import { MhanndalorianClient, PlayerResponse } from "./mhanndalorian-client"
import { TerritoryBattle } from "../../model/territory-battle"

export class CachedMhanndalorianClient {
  private static instance: CachedMhanndalorianClient
  private cache: CacheService
  private client: MhanndalorianClient
  private static readonly MAX_RETRIES = 3
  private static readonly BASE_DELAY = 1000 // 1 second
  private static readonly TB_CACHE_TTL = 15 * 60 * 1000 // 15 minutes (TB data doesn't change frequently)

  private constructor(client: MhanndalorianClient) {
    this.cache = CacheService.getInstance()
    this.client = client
  }

  public static getInstance(client: MhanndalorianClient): CachedMhanndalorianClient {
    if (!CachedMhanndalorianClient.instance) {
      CachedMhanndalorianClient.instance = new CachedMhanndalorianClient(client)
    }
    return CachedMhanndalorianClient.instance
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    for (let attempt = 0; attempt <= CachedMhanndalorianClient.MAX_RETRIES; attempt++) {
      try {
        return await operation()
      } catch (error: unknown) {
        const errorObj = error as {
          message?: string
          response?: { status?: number }
        }

        const statusCode =
          errorObj?.response?.status ||
          (errorObj?.message?.includes("503") ? 503 : null) ||
          (errorObj?.message?.includes("502") ? 502 : null) ||
          (errorObj?.message?.includes("504") ? 504 : null) ||
          (errorObj?.message?.includes("429") ? 429 : null)

        const isTransientError =
          statusCode === 503 ||
          statusCode === 502 ||
          statusCode === 504 ||
          statusCode === 429

        if (isTransientError && attempt < CachedMhanndalorianClient.MAX_RETRIES) {
          const delay = CachedMhanndalorianClient.BASE_DELAY * Math.pow(2, attempt)
          console.warn(
            `Transient error (${statusCode}) in ${operationName} (attempt ${attempt + 1}/${CachedMhanndalorianClient.MAX_RETRIES + 1}). Retrying in ${delay}ms...`,
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }

        // If it's not a transient error or we've exhausted retries, throw
        throw error
      }
    }

    // This should never be reached, but TypeScript needs it
    throw new Error(
      `Failed ${operationName} after ${CachedMhanndalorianClient.MAX_RETRIES + 1} attempts`,
    )
  }

  public async getPlayer(
    allyCode?: string,
    enums: boolean = false,
  ): Promise<PlayerResponse> {
    const cacheKey = `mhanndalorian:player:${allyCode || "default"}:${enums}`
    return this.cache.getOrSet(
      cacheKey,
      () =>
        this.retryWithBackoff(
          () => this.client.getPlayer(allyCode, enums),
          `getPlayer(${allyCode || "default"})`,
        ),
    )
  }

  public async getTB(
    allyCode?: string,
    enums: boolean = false,
  ): Promise<TerritoryBattle> {
    const cacheKey = `mhanndalorian:tb:${allyCode || "default"}:${enums}`
    return this.cache.getOrSet(
      cacheKey,
      () =>
        this.retryWithBackoff(
          () => this.client.getTB(allyCode, enums),
          `getTB(${allyCode || "default"})`,
        ),
      CachedMhanndalorianClient.TB_CACHE_TTL,
    )
  }
}
