/* eslint-disable @typescript-eslint/no-explicit-any */
import { EmbedBuilder } from "discord.js"
import { TicketViolationRow } from "../../db/ticket-violation-client"
import { ViolationSummaryService } from "../violation-summary"

// Mock dependencies without importing them directly
jest.mock("../../discord-bot-client", () => ({
  DiscordBotClient: jest.fn().mockImplementation(() => ({
    channels: {
      fetch: jest.fn().mockResolvedValue({
        isTextBased: jest.fn().mockReturnValue(true),
        send: jest.fn().mockResolvedValue(undefined),
      }),
    },
  })),
}))

// Mock the container
jest.mock("@sapphire/pieces", () => ({
  container: {
    ticketViolationClient: {
      getWeeklyViolations: jest.fn(),
      getMonthlyViolations: jest.fn(),
    },
    cachedComlinkClient: {
      getGuild: jest.fn(),
    },
  },
}))

// Mock discord.js
jest.mock("discord.js", () => ({
  EmbedBuilder: jest.fn().mockImplementation(() => ({
    setColor: jest.fn().mockReturnThis(),
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setTimestamp: jest.fn().mockReturnThis(),
    addFields: jest.fn().mockReturnThis(),
  })),
  TextChannel: jest.fn(),
}))

// Import the mocks after they are defined
const mockContainer = jest.requireMock("@sapphire/pieces").container
const { DiscordBotClient } = jest.requireMock("../../discord-bot-client")

describe("ViolationSummaryService", () => {
  let service: ViolationSummaryService
  let mockClient: any
  let mockChannel: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Create a mocked client
    mockChannel = {
      isTextBased: jest.fn().mockReturnValue(true),
      send: jest.fn().mockResolvedValue(undefined),
    }
    mockClient = new DiscordBotClient()
    mockClient.channels.fetch.mockResolvedValue(mockChannel)
    service = new ViolationSummaryService(mockClient)
  })

  describe("collectViolationCounts", () => {
    it("should correctly count violations and ticket sums per player", () => {
      // Setup test data
      const violations: TicketViolationRow[] = [
        {
          guild_id: "123456789",
          date: new Date(),
          ticket_counts: {
            player1: 500,
            player2: 600,
          },
        },
        {
          guild_id: "123456789",
          date: new Date(),
          ticket_counts: {
            player1: 450,
            player3: 550,
          },
        },
      ]

      // Access the private method
      const collectViolationCounts = (
        service as any
      ).collectViolationCounts.bind(service)

      // Execute the method
      const result = collectViolationCounts(violations)

      // Verify the results
      expect(result.size).toBe(3) // Should have 3 players

      // Check player1 with 2 violations
      const player1 = result.get("player1")
      expect(player1).toBeDefined()
      expect(player1?.violations).toBe(2)
      expect(player1?.ticketSum).toBe(950)

      // Check player2 with 1 violation
      const player2 = result.get("player2")
      expect(player2).toBeDefined()
      expect(player2?.violations).toBe(1)
      expect(player2?.ticketSum).toBe(600)

      // Check player3 with 1 violation
      const player3 = result.get("player3")
      expect(player3).toBeDefined()
      expect(player3?.violations).toBe(1)
      expect(player3?.ticketSum).toBe(550)
    })

    it("should handle empty ticket_counts", () => {
      // Setup test data with empty ticket_counts
      const violations: TicketViolationRow[] = [
        {
          guild_id: "123456789",
          date: new Date(),
          ticket_counts: {},
        },
      ]

      // Access the private method
      const collectViolationCounts = (
        service as any
      ).collectViolationCounts.bind(service)

      // Execute the method
      const result = collectViolationCounts(violations)

      // Verify the results
      expect(result.size).toBe(0) // Should have no players
    })
  })

  describe("calculateMissingTickets", () => {
    it("should calculate missing tickets correctly", () => {
      // Access the private method
      const calculateMissingTickets = (
        service as any
      ).calculateMissingTickets.bind(service)

      // Test case 1: Some tickets missing
      const counter1 = { violations: 3, ticketSum: 1500 }
      // Expected: 3 * 600 - 1500 = 300
      expect(calculateMissingTickets(counter1)).toBe(300)

      // Test case 2: No tickets missing (all tickets collected)
      const counter2 = { violations: 2, ticketSum: 1200 }
      // Expected: 2 * 600 - 1200 = 0
      expect(calculateMissingTickets(counter2)).toBe(0)

      // Test case 3: Many tickets missing
      const counter3 = { violations: 5, ticketSum: 1000 }
      // Expected: 5 * 600 - 1000 = 2000
      expect(calculateMissingTickets(counter3)).toBe(2000)
    })
  })

  describe("calculateAverageTickets", () => {
    it("should calculate average tickets correctly", () => {
      // Access the private method
      const calculateAverageTickets = (
        service as any
      ).calculateAverageTickets.bind(service)

      // Mock calculateMissingTickets to return known values
      const calculateMissingTicketsSpy = jest
        .spyOn(service as any, "calculateMissingTickets")
        .mockImplementation((counter: any) => {
          if (counter.violations === 3) return 300
          if (counter.violations === 5) return 1500
          return 0
        })

      // Test case 1
      const counter1 = { violations: 3, ticketSum: 1500 }
      const daysInPeriod1 = 7
      // Expected: (7 * 600 - 300) / 7 = 3900 / 7 = 557.14
      expect(calculateAverageTickets(counter1, daysInPeriod1)).toBeCloseTo(
        557.14,
        1,
      )

      // Test case 2
      const counter2 = { violations: 5, ticketSum: 1500 }
      const daysInPeriod2 = 30
      // Expected: (30 * 600 - 1500) / 30 = 16500 / 30 = 550
      expect(calculateAverageTickets(counter2, daysInPeriod2)).toBe(550)

      // Clean up
      calculateMissingTicketsSpy.mockRestore()
    })
  })

  describe("sendSummaryReport", () => {
    it("should generate and send a formatted report", async () => {
      // Access the private method
      const sendSummaryReport = (service as any).sendSummaryReport.bind(service)

      // Create test data
      const channelId = "channel123"
      const guildName = "Test Guild"
      const violations: TicketViolationRow[] = [
        {
          guild_id: "123456789",
          date: new Date(),
          ticket_counts: {
            player1: 500,
            player2: 600,
          },
        },
      ]

      // Mock guild data response
      mockContainer.cachedComlinkClient.getGuild.mockResolvedValue({
        guild: {
          member: [
            { playerId: "player1", playerName: "Test Player 1" },
            { playerId: "player2", playerName: "Test Player 2" },
          ],
        },
      })

      // Spy on calculatePlayerStats
      const calculatePlayerStatsSpy = jest
        .spyOn(service as any, "calculatePlayerStats")
        .mockReturnValue(
          new Map([
            [
              "player1",
              {
                playerName: "Test Player 1",
                violationCount: 1,
                averageTickets: 500,
                totalMissingTickets: 100,
              },
            ],
            [
              "player2",
              {
                playerName: "Test Player 2",
                violationCount: 1,
                averageTickets: 600,
                totalMissingTickets: 0,
              },
            ],
          ]),
        )

      // Spy on createPlayerStatsEmbed
      const createPlayerStatsEmbedSpy = jest
        .spyOn(service as any, "createPlayerStatsEmbed")
        .mockReturnValue(new EmbedBuilder())

      // Call the method
      await sendSummaryReport(channelId, guildName, violations, "Weekly", 7)

      // Verify channel was fetched
      expect(mockClient.channels.fetch).toHaveBeenCalledWith(channelId)

      // Verify guild data was fetched
      expect(mockContainer.cachedComlinkClient.getGuild).toHaveBeenCalledWith(
        "123456789",
        true,
      )

      // Verify calculatePlayerStats was called
      expect(calculatePlayerStatsSpy).toHaveBeenCalledWith(
        violations,
        7,
        expect.any(Map),
      )

      // Verify EmbedBuilder was used
      expect(EmbedBuilder).toHaveBeenCalled()

      // Verify channel.send was called with embeds
      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
        }),
      )

      // Clean up
      calculatePlayerStatsSpy.mockRestore()
      createPlayerStatsEmbedSpy.mockRestore()
    })

    it("should handle error when channel is not found", async () => {
      // Access the private method
      const sendSummaryReport = (service as any).sendSummaryReport.bind(service)

      // Mock channel fetch to return a non-text channel
      mockClient.channels.fetch.mockResolvedValueOnce({
        isTextBased: jest.fn().mockReturnValue(false),
      })

      // Setup console.error spy
      const consoleSpy = jest.spyOn(console, "error").mockImplementation()

      // Call the method
      await sendSummaryReport(
        "channel123",
        "Test Guild",
        [{ guild_id: "123456789", date: new Date(), ticket_counts: {} }],
        "Weekly",
        7,
      )

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Channel channel123 not found or not a text channel",
        ),
      )

      // Clean up
      consoleSpy.mockRestore()
    })
  })

  describe("createPlayerStatsEmbed", () => {
    it("should create a properly formatted embed", () => {
      // Access the private method
      const createPlayerStatsEmbed = (
        service as any
      ).createPlayerStatsEmbed.bind(service)

      // Create test data
      const playerStats = [
        {
          playerName: "Test Player 1",
          violationCount: 2,
          averageTickets: 550,
          totalMissingTickets: 100,
        },
        {
          playerName: "Test Player 2",
          violationCount: 1,
          averageTickets: 580,
          totalMissingTickets: 20,
        },
      ]

      // Call the method
      const embed = createPlayerStatsEmbed(
        playerStats,
        "Test Guild",
        "Weekly",
        1,
        1,
      )

      // Verify the embed was configured correctly
      expect(embed.setColor).toHaveBeenCalledWith(0x0099ff)
      expect(embed.setTitle).toHaveBeenCalledWith(
        "Weekly Player Ticket Statistics - Test Guild",
      )
      expect(embed.setDescription).toHaveBeenCalledWith("Page 1 of 1")
      expect(embed.setTimestamp).toHaveBeenCalled()
      expect(embed.addFields).toHaveBeenCalledTimes(2)
    })
  })

  describe("generateWeeklySummary", () => {
    it("should handle empty violations", async () => {
      // Setup mock to return empty violations
      mockContainer.ticketViolationClient.getWeeklyViolations.mockResolvedValue(
        [],
      )

      // Setup console.log spy
      const consoleSpy = jest.spyOn(console, "log").mockImplementation()

      // Call the method
      await service.generateWeeklySummary(
        "123456789",
        "channel123",
        "Test Guild",
      )

      // Verify no report was sent
      expect(mockClient.channels.fetch).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("No violations found"),
      )

      // Clean up
      consoleSpy.mockRestore()
    })

    it("should handle errors gracefully", async () => {
      // Setup mock to throw error
      mockContainer.ticketViolationClient.getWeeklyViolations.mockRejectedValue(
        new Error("Test error"),
      )

      // Setup console.error spy
      const consoleSpy = jest.spyOn(console, "error").mockImplementation()

      // Call the method
      await service.generateWeeklySummary(
        "123456789",
        "channel123",
        "Test Guild",
      )

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error generating weekly summary"),
        expect.any(Error),
      )

      // Clean up
      consoleSpy.mockRestore()
    })
  })

  describe("transformCountersToStats", () => {
    it("should filter out players without names", () => {
      // Create a private method accessor for testing
      const transformCountersToStats = (
        service as any
      ).transformCountersToStats.bind(service)

      // Create test data
      const playerCounters = new Map()
      playerCounters.set("player1", { violations: 5, ticketSum: 2500 })
      playerCounters.set("player2", { violations: 3, ticketSum: 1500 })
      playerCounters.set("unknownPlayer", { violations: 4, ticketSum: 2000 })

      const daysInPeriod = 7

      // Create player names map (only including player1 and player2)
      const playerNames = new Map()
      playerNames.set("player1", "Test Player 1")
      playerNames.set("player2", "Test Player 2")
      // No name for 'unknownPlayer'

      // Call the method
      const result = transformCountersToStats(
        playerCounters,
        daysInPeriod,
        playerNames,
      )

      // Check that only players with names are included
      expect(result.has("player1")).toBe(true)
      expect(result.has("player2")).toBe(true)
      expect(result.has("unknownPlayer")).toBe(false)

      // Verify the returned data
      expect(result.get("player1")?.playerName).toBe("Test Player 1")
      expect(result.get("player2")?.playerName).toBe("Test Player 2")

      // Verify counts are calculated correctly
      expect(result.get("player1")?.violationCount).toBe(5)
      expect(result.get("player2")?.violationCount).toBe(3)
    })

    it("should skip players with zero violations", () => {
      // Create a private method accessor for testing
      const transformCountersToStats = (
        service as any
      ).transformCountersToStats.bind(service)

      // Create test data with a player having zero violations
      const playerCounters = new Map()
      playerCounters.set("player1", { violations: 0, ticketSum: 0 })
      playerCounters.set("player2", { violations: 3, ticketSum: 1500 })

      const daysInPeriod = 7

      // Create player names map for both players
      const playerNames = new Map()
      playerNames.set("player1", "Test Player 1")
      playerNames.set("player2", "Test Player 2")

      // Call the method
      const result = transformCountersToStats(
        playerCounters,
        daysInPeriod,
        playerNames,
      )

      // Check that only player2 is included
      expect(result.has("player1")).toBe(false)
      expect(result.has("player2")).toBe(true)
    })
  })
})
