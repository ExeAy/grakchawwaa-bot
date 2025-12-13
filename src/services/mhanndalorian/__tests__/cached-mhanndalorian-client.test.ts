/* eslint-disable @typescript-eslint/no-explicit-any */
import { CachedMhanndalorianClient } from "../cached-mhanndalorian-client"
import { MhanndalorianClient } from "../mhanndalorian-client"
import { CacheService } from "../../cache-service"
import { TerritoryBattle } from "../../../model/territory-battle"

// Mock dependencies
jest.mock("../mhanndalorian-client")
jest.mock("../../cache-service")

describe("CachedMhanndalorianClient", () => {
  let cachedClient: CachedMhanndalorianClient
  let mockClient: jest.Mocked<MhanndalorianClient>
  let mockCacheService: jest.Mocked<CacheService>

  beforeEach(() => {
    // Reset singleton instance
    ;(CachedMhanndalorianClient as any).instance = undefined

    // Create mock client
    mockClient = new MhanndalorianClient({
      apiKey: "test-key",
      discordId: "test-id",
      allyCode: "123456789",
    }) as jest.Mocked<MhanndalorianClient>

    // Create mock cache service
    mockCacheService = {
      getOrSet: jest.fn(),
    } as any

    // Mock CacheService.getInstance
    ;(CacheService.getInstance as jest.Mock).mockReturnValue(mockCacheService)

    cachedClient = CachedMhanndalorianClient.getInstance(mockClient)

    jest.clearAllMocks()
  })

  describe("getTB", () => {
    it("should use cache with 15-minute TTL", async () => {
      const mockTB: TerritoryBattle = {
        isActive: true,
        conflictZones: [],
        strikeZones: [],
        reconZones: [],
      }

      mockCacheService.getOrSet.mockResolvedValueOnce(mockTB)

      const result = await cachedClient.getTB()

      expect(mockCacheService.getOrSet).toHaveBeenCalledWith(
        "mhanndalorian:tb:default:false",
        expect.any(Function),
        15 * 60 * 1000, // 15 minutes
      )
      expect(result).toEqual(mockTB)
    })

    it("should use custom ally code in cache key", async () => {
      const mockTB: TerritoryBattle = {
        isActive: false,
        conflictZones: [],
        strikeZones: [],
        reconZones: [],
      }

      mockCacheService.getOrSet.mockResolvedValueOnce(mockTB)

      await cachedClient.getTB("987654321", true)

      expect(mockCacheService.getOrSet).toHaveBeenCalledWith(
        "mhanndalorian:tb:987654321:true",
        expect.any(Function),
        15 * 60 * 1000,
      )
    })

    it("should call client.getTB when cache misses", async () => {
      const mockTB: TerritoryBattle = {
        isActive: true,
        conflictZones: [
          {
            status: {
              zoneId: "zone_1",
              zoneState: 1,
              score: 1000,
              channelId: "ch_1",
              commandMessage: "",
              commandState: 0,
            },
          },
        ],
        strikeZones: [],
        reconZones: [],
      }

      mockClient.getTB = jest.fn().mockResolvedValue(mockTB)

      // Simulate cache miss by calling the fetch function
      mockCacheService.getOrSet.mockImplementation(async (_key, fetchFn) => {
        return await fetchFn()
      })

      const result = await cachedClient.getTB()

      expect(mockClient.getTB).toHaveBeenCalledWith(undefined, false)
      expect(result).toEqual(mockTB)
    })

    it("should retry on transient errors", async () => {
      const mockTB: TerritoryBattle = {
        isActive: true,
        conflictZones: [],
        strikeZones: [],
        reconZones: [],
      }

      // First call fails with 503, second succeeds
      mockClient.getTB = jest
        .fn()
        .mockRejectedValueOnce(new Error("Mhanndalorian API error (503): Service Unavailable"))
        .mockResolvedValueOnce(mockTB)

      mockCacheService.getOrSet.mockImplementation(async (_key, fetchFn) => {
        return await fetchFn()
      })

      const result = await cachedClient.getTB()

      expect(mockClient.getTB).toHaveBeenCalledTimes(2)
      expect(result).toEqual(mockTB)
    })

    it("should not retry on non-transient errors", async () => {
      const error = new Error("Mhanndalorian API error (401): Unauthorized")

      mockClient.getTB = jest.fn().mockRejectedValue(error)

      mockCacheService.getOrSet.mockImplementation(async (_key, fetchFn) => {
        return await fetchFn()
      })

      await expect(cachedClient.getTB()).rejects.toThrow(
        "Mhanndalorian API error (401): Unauthorized",
      )

      expect(mockClient.getTB).toHaveBeenCalledTimes(1)
    })

    it(
      "should exhaust retries after 3 attempts",
      async () => {
        const error = new Error("Mhanndalorian API error (503): Service Unavailable")

        mockClient.getTB = jest.fn().mockRejectedValue(error)

        mockCacheService.getOrSet.mockImplementation(async (_key, fetchFn) => {
          return await fetchFn()
        })

        await expect(cachedClient.getTB()).rejects.toThrow()

        // 1 initial attempt + 3 retries = 4 total calls
        expect(mockClient.getTB).toHaveBeenCalledTimes(4)
      },
      10000, // 10 second timeout (retries take 1s + 2s + 4s = 7s)
    )
  })

  describe("getPlayer", () => {
    it("should use default cache TTL (2 minutes)", async () => {
      const mockPlayer = {
        name: "Test Player",
        allyCode: 123456789,
      }

      mockCacheService.getOrSet.mockResolvedValueOnce(mockPlayer)

      await cachedClient.getPlayer()

      expect(mockCacheService.getOrSet).toHaveBeenCalledWith(
        "mhanndalorian:player:default:false",
        expect.any(Function),
        // Note: Default TTL is used (no third parameter means cache service default)
      )
    })
  })

  describe("singleton pattern", () => {
    it("should return same instance", () => {
      const instance1 = CachedMhanndalorianClient.getInstance(mockClient)
      const instance2 = CachedMhanndalorianClient.getInstance(mockClient)

      expect(instance1).toBe(instance2)
    })
  })
})
