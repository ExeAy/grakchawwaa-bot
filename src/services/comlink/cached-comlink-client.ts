import { container } from "@sapphire/pieces"
import { ComlinkGuildData, ComlinkPlayerData } from "@swgoh-utils/comlink"
import { CacheService } from "../cache-service"

export class CachedComlinkClient {
  private static instance: CachedComlinkClient
  private cache: CacheService

  private constructor() {
    this.cache = CacheService.getInstance()
  }

  public static getInstance(): CachedComlinkClient {
    if (!CachedComlinkClient.instance) {
      CachedComlinkClient.instance = new CachedComlinkClient()
    }
    return CachedComlinkClient.instance
  }

  public async getGuild(
    guildId: string,
    includeActivity: boolean,
  ): Promise<ComlinkGuildData | null> {
    const cacheKey = `guild:${guildId}:${includeActivity}`
    return this.cache.getOrSet(cacheKey, () =>
      container.comlinkClient.getGuild(guildId, includeActivity),
    )
  }

  public async getPlayer(allyCode: string): Promise<ComlinkPlayerData | null> {
    const cacheKey = `player:${allyCode}`
    return this.cache.getOrSet(cacheKey, () =>
      container.comlinkClient.getPlayer(allyCode),
    )
  }
}
