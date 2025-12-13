/* eslint-disable @typescript-eslint/no-explicit-any */
import { MhanndalorianClient } from "../mhanndalorian-client"
import { TerritoryBattle } from "../../../model/territory-battle"

// Mock fetch globally
global.fetch = jest.fn()

describe("MhanndalorianClient", () => {
  let client: MhanndalorianClient

  beforeEach(() => {
    client = new MhanndalorianClient({
      apiKey: "test-api-key",
      discordId: "test-discord-id",
      allyCode: "123456789",
    })
    jest.clearAllMocks()
  })

  describe("getTB", () => {
    it("should transform a valid TB response into TerritoryBattle model", async () => {
      const mockResponse = {
        code: 0,
        territoryBattleStatus: {
          conflictZoneStatus: [
            {
              zoneStatus: {
                zoneId: "test_conflict_zone_01",
                zoneState: 4,
                score: "1000000",
                channelId: "channel_123",
                commandMessage: "Test message",
                commandState: 1,
              },
            },
          ],
          strikeZoneStatus: [
            {
              playersParticipated: 25,
              zoneStatus: {
                zoneId: "test_strike_zone_01",
                zoneState: 3,
                score: "500000",
                channelId: "channel_456",
                commandMessage: "",
                commandState: 0,
              },
            },
          ],
          reconZoneStatus: [
            {
              platoon: [
                {
                  id: "platoon_1",
                  squad: [
                    {
                      id: "squad_1",
                      unit: [
                        {
                          unitIdentifier: "JEDIKNIGHTREVAN:SEVEN_STAR",
                          level: 85,
                          memberId: "member_123",
                          tier: 13,
                          unitRelicTier: 7,
                        },
                      ],
                    },
                  ],
                },
              ],
              zoneStatus: {
                zoneId: "test_recon_zone_01",
                zoneState: 2,
                score: "750000",
                channelId: "channel_789",
                commandMessage: "Recon message",
                commandState: 1,
              },
            },
          ],
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result: TerritoryBattle = await client.getTB()

      expect(result.isActive).toBe(true)
      expect(result.conflictZones).toHaveLength(1)
      expect(result.strikeZones).toHaveLength(1)
      expect(result.reconZones).toHaveLength(1)

      // Verify conflict zone transformation
      expect(result.conflictZones[0].status).toEqual({
        zoneId: "test_conflict_zone_01",
        zoneState: 4,
        score: 1000000,
        channelId: "channel_123",
        commandMessage: "Test message",
        commandState: 1,
      })

      // Verify strike zone transformation
      expect(result.strikeZones[0].playersParticipated).toBe(25)
      expect(result.strikeZones[0].status.score).toBe(500000)

      // Verify recon zone with platoons
      expect(result.reconZones[0].platoons).toHaveLength(1)
      expect(result.reconZones[0].platoons[0].id).toBe("platoon_1")
      expect(result.reconZones[0].platoons[0].squads).toHaveLength(1)
      expect(result.reconZones[0].platoons[0].squads[0].units).toHaveLength(1)
      expect(result.reconZones[0].platoons[0].squads[0].units[0]).toEqual({
        unitIdentifier: "JEDIKNIGHTREVAN:SEVEN_STAR",
        level: 85,
        memberId: "member_123",
        tier: 13,
        relicTier: 7,
      })
    })

    it("should return inactive TB when territoryBattleStatus is missing", async () => {
      const mockResponse = {
        code: 0,
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result: TerritoryBattle = await client.getTB()

      expect(result.isActive).toBe(false)
      expect(result.conflictZones).toEqual([])
      expect(result.strikeZones).toEqual([])
      expect(result.reconZones).toEqual([])
    })

    it("should handle empty zone arrays", async () => {
      const mockResponse = {
        code: 0,
        territoryBattleStatus: {
          conflictZoneStatus: [],
          strikeZoneStatus: [],
          reconZoneStatus: [],
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result: TerritoryBattle = await client.getTB()

      expect(result.isActive).toBe(true)
      expect(result.conflictZones).toEqual([])
      expect(result.strikeZones).toEqual([])
      expect(result.reconZones).toEqual([])
    })

    it("should throw error on API failure", async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      })

      await expect(client.getTB()).rejects.toThrow(
        "Mhanndalorian API error (401): Unauthorized",
      )
    })

    it("should include proper headers in request", async () => {
      const mockResponse = {
        code: 0,
        territoryBattleStatus: {
          conflictZoneStatus: [],
          strikeZoneStatus: [],
          reconZoneStatus: [],
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await client.getTB()

      expect(global.fetch).toHaveBeenCalledWith(
        "https://mhanndalorianbot.work/api/tb",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "Accept-Encoding": "br,gzip,deflate",
            "api-key": "test-api-key",
            "x-discord-id": "test-discord-id",
          }),
        }),
      )
    })

    it("should use custom ally code when provided", async () => {
      const mockResponse = {
        code: 0,
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await client.getTB("987654321")

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)

      expect(requestBody.payload.allyCode).toBe("987654321")
    })

    it("should handle score string to number conversion", async () => {
      const mockResponse = {
        code: 0,
        territoryBattleStatus: {
          conflictZoneStatus: [
            {
              zoneStatus: {
                zoneId: "zone_1",
                zoneState: 1,
                score: "12345678",
                channelId: "ch_1",
                commandState: 1,
              },
            },
          ],
          strikeZoneStatus: [],
          reconZoneStatus: [],
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.getTB()

      expect(result.conflictZones[0].status.score).toBe(12345678)
      expect(typeof result.conflictZones[0].status.score).toBe("number")
    })
  })

  describe("getPlayer", () => {
    it("should make request to /player endpoint", async () => {
      const mockResponse = {
        name: "Test Player",
        allyCode: 123456789,
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.getPlayer()

      expect(global.fetch).toHaveBeenCalledWith(
        "https://mhanndalorianbot.work/api/player",
        expect.any(Object),
      )
      expect(result).toEqual(mockResponse)
    })
  })
})
