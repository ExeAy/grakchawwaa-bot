/* eslint-disable @typescript-eslint/no-explicit-any */
import { AnniversaryMonitorService } from "../anniversary-monitor"

const originalConsoleLog = console.log

beforeAll(() => {
  console.log = jest.fn()
})

afterEach(() => {
  ;(console.log as jest.Mock).mockClear()
})

afterAll(() => {
  console.log = originalConsoleLog
})

// Mock Discord.js
jest.mock("discord.js", () => ({
  // We still need TextChannel mocked
  TextChannel: jest.fn(),
  channelMention: jest.fn().mockImplementation((id) => `<#${id}>`),
}))

// Mock DiscordBotClient
jest.mock("../../discord-bot-client", () => ({
  DiscordBotClient: jest.fn().mockImplementation(() => ({
    channels: {
      fetch: jest.fn(),
    },
  })),
}))

// Mock the container
jest.mock("@sapphire/pieces", () => ({
  container: {
    ticketChannelClient: {
      getAllGuilds: jest.fn(),
    },
    cachedComlinkClient: {
      getGuild: jest.fn(),
    },
  },
}))

// Import the mocks after they are defined
const mockContainer = jest.requireMock("@sapphire/pieces").container
const { DiscordBotClient } = jest.requireMock("../../discord-bot-client")

describe("AnniversaryMonitorService", () => {
  let service: AnniversaryMonitorService
  let mockClient: any
  let mockChannel: any
  let realDateNow: () => number

  beforeEach(() => {
    jest.clearAllMocks()

    // Store the real Date.now function
    realDateNow = Date.now

    // Create a mocked channel
    mockChannel = {
      isTextBased: jest.fn().mockReturnValue(true),
      send: jest.fn().mockResolvedValue(undefined),
    }

    // Create a mocked client
    mockClient = new DiscordBotClient()
    mockClient.channels.fetch.mockResolvedValue(mockChannel)
    service = new AnniversaryMonitorService(mockClient as any)
  })

  afterEach(() => {
    // Restore the real Date.now function
    Date.now = realDateNow

    // Stop the service if it's running
    service.stop()
  })

  describe("checkGuildAnniversaries", () => {
    it("should process anniversaries for guilds with anniversary channels", async () => {
      // Setup guild data with anniversary channels
      const mockGuilds = [
        {
          guild_id: "guild1",
          anniversary_channel_id: "channel1",
        },
        {
          guild_id: "guild2",
          anniversary_channel_id: "channel2",
        },
        {
          guild_id: "guild3",
          anniversary_channel_id: null, // This guild should be skipped
        },
      ]

      // Mock the getGuild response for guild1
      const today = new Date()
      const oneYearAgo = new Date(today)
      oneYearAgo.setFullYear(today.getFullYear() - 1)
      const twoYearsAgo = new Date(today)
      twoYearsAgo.setFullYear(today.getFullYear() - 2)

      // Create timestamps that will match "today" but different years ago
      const oneYearAgoTimestamp = Math.floor(
        oneYearAgo.getTime() / 1000,
      ).toString()
      const twoYearsAgoTimestamp = Math.floor(
        twoYearsAgo.getTime() / 1000,
      ).toString()
      const differentDayTimestamp = Math.floor(
        new Date(
          today.getFullYear() - 3,
          today.getMonth(),
          today.getDate() + 1,
        ).getTime() / 1000,
      ).toString()

      const mockGuildData1 = {
        guild: {
          profile: { name: "Test Guild 1" },
          member: [
            {
              playerId: "player1",
              playerName: "Player One",
              guildJoinTime: oneYearAgoTimestamp,
            },
            {
              playerId: "player2",
              playerName: "Player Two",
              guildJoinTime: twoYearsAgoTimestamp,
            },
            {
              playerId: "player3",
              playerName: "Player Three",
              guildJoinTime: differentDayTimestamp, // Not an anniversary
            },
          ],
        },
      }

      // Mock the getGuild response for guild2 (no members with anniversaries)
      const mockGuildData2 = {
        guild: {
          profile: { name: "Test Guild 2" },
          member: [
            {
              playerId: "player4",
              playerName: "Player Four",
              guildJoinTime: differentDayTimestamp, // Not an anniversary
            },
          ],
        },
      }

      // Set up the mocks
      mockContainer.ticketChannelClient.getAllGuilds.mockResolvedValue(
        mockGuilds,
      )

      mockContainer.cachedComlinkClient.getGuild.mockImplementation(
        (guildId: string) => {
          if (guildId === "guild1") return Promise.resolve(mockGuildData1)
          if (guildId === "guild2") return Promise.resolve(mockGuildData2)
          return Promise.resolve(null)
        },
      )

      // Reset the channel.send mock to clear any previous calls
      mockChannel.send.mockClear()

      // Call the method under test
      await (service as any).checkGuildAnniversaries()

      // Verify that getAllGuilds was called
      expect(mockContainer.ticketChannelClient.getAllGuilds).toHaveBeenCalled()

      // Verify that getGuild was called for guild1 and guild2
      expect(mockContainer.cachedComlinkClient.getGuild).toHaveBeenCalledWith(
        "guild1",
        true,
      )
      expect(mockContainer.cachedComlinkClient.getGuild).toHaveBeenCalledWith(
        "guild2",
        true,
      )

      // Verify that channel.fetch was called for the correct channel
      expect(mockClient.channels.fetch).toHaveBeenCalledWith("channel1")

      // Verify that channel.send was called with a text message
      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("Guild Membership Anniversaries"),
        }),
      )
    })
  })

  describe("start and stop", () => {
    it("should set and clear interval when starting and stopping", () => {
      // Mock setInterval and clearInterval
      const originalSetInterval = global.setInterval
      const originalClearInterval = global.clearInterval
      const originalSetTimeout = global.setTimeout

      const mockInterval = {} as NodeJS.Timeout

      // Simply mock setTimeout without __promisify__
      global.setInterval = jest.fn().mockReturnValue(mockInterval)
      global.clearInterval = jest.fn()
      global.setTimeout = jest.fn() as any

      // Start the service
      service.start()

      // Verify setTimeout was called for scheduling
      expect(global.setTimeout).toHaveBeenCalled()

      // Verify setInterval was also called
      expect(global.setInterval).toHaveBeenCalled()

      // Stop the service
      service.stop()

      // Verify clearInterval was called
      expect(global.clearInterval).toHaveBeenCalled()

      // Restore originals
      global.setInterval = originalSetInterval
      global.clearInterval = originalClearInterval
      global.setTimeout = originalSetTimeout
    })
  })
})
