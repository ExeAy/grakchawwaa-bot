interface CacheEntry<T> {
  data: T
  expiresAt: number
}

export class CacheService {
  private static instance: CacheService
  private cache: Map<string, CacheEntry<unknown>>
  private readonly defaultTTL: number = 2 * 60 * 1000 // 2 minutes in milliseconds
  private cleanupInterval: NodeJS.Timeout | null = null
  private static CLEANUP_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

  private constructor() {
    this.cache = new Map()
    this.startCleanupInterval()
  }

  private startCleanupInterval(): void {
    // Clear expired items immediately on start
    this.clearExpired()

    // Set up daily cleanup
    this.cleanupInterval = setInterval(() => {
      console.log("Running daily cache cleanup")
      this.clearExpired()
    }, CacheService.CLEANUP_INTERVAL)
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService()
    }
    return CacheService.instance
  }

  public async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = this.defaultTTL,
  ): Promise<T> {
    const now = Date.now()
    const cached = this.cache.get(key) as CacheEntry<T> | undefined

    if (cached && cached.expiresAt > now) {
      return cached.data
    }

    const data = await fetchFn()
    this.cache.set(key, {
      data,
      expiresAt: now + ttl,
    })

    return data
  }

  public clear(): void {
    this.cache.clear()
  }

  public clearExpired(): void {
    const now = Date.now()
    let clearedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key)
        clearedCount++
      }
    }

    if (clearedCount > 0) {
      console.log(`Cleared ${clearedCount} expired cache entries`)
    }
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.cache.clear()
  }
}
