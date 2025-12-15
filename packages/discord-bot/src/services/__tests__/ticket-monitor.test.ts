/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComlinkGuildData, ComlinkGuildMember } from "@swgoh-utils/comlink"
import { TicketMonitorService } from "../ticket-monitor"

// Define the interface for test purposes since it's not exported
interface TicketViolator {
  id: string
  name: string
  tickets: number
}

const originalConsoleLog = console.log
const originalConsoleError = console.error

beforeAll(() => {
  console.log = jest.fn()
  console.error = jest.fn()
})

afterEach(() => {
  ;(console.log as jest.Mock).mockClear()
  ;(console.error as jest.Mock).mockClear()
})

afterAll(() => {
  console.log = originalConsoleLog
  console.error = originalConsoleError
})

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
    ticketChannelClient: {
      getAllGuilds: jest.fn(),
      registerChannel: jest.fn(),
    },
    ticketViolationClient: {
      recordViolations: jest.fn(),
    },
    cachedComlinkClient: {
      getGuild: jest.fn(),
    },
    playerClient: {
      findDiscordIdByAllyCode: jest.fn(),
    },
    comlinkClient: {
      getPlayer: jest.fn(),
    },
  },
}))

// Mock embedBuilder constructor and its methods
const mockSetColor = jest.fn().mockReturnThis()
const mockSetTitle = jest.fn().mockReturnThis()
const mockSetDescription = jest.fn().mockReturnThis()
const mockSetTimestamp = jest.fn().mockReturnThis()
const mockAddFields = jest.fn().mockReturnThis()
const mockSetFooter = jest.fn().mockReturnThis()

// Mock discord.js
jest.mock("discord.js", () => ({
  EmbedBuilder: jest.fn().mockImplementation(() => ({
    setColor: mockSetColor,
    setTitle: mockSetTitle,
    setDescription: mockSetDescription,
    setTimestamp: mockSetTimestamp,
    addFields: mockAddFields,
    setFooter: mockSetFooter,
  })),
  TextChannel: jest.fn(),
  userMention: jest.fn((id: string) => `<@${id}>`),
}))

// Mock ViolationSummaryService
jest.mock("../violation-summary", () => ({
  ViolationSummaryService: jest.fn().mockImplementation(() => ({
    generateWeeklySummary: jest.fn().mockResolvedValue(undefined),
    generateMonthlySummary: jest.fn().mockResolvedValue(undefined),
  })),
}))

// Import the mocks after they are defined
const mockContainer = jest.requireMock("@sapphire/pieces").container
const { DiscordBotClient } = jest.requireMock("../../discord-bot-client")
const MockEmbedBuilder = jest.requireMock("discord.js").EmbedBuilder

describe("TicketMonitorService", () => {
  let service: TicketMonitorService
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
    service = new TicketMonitorService(mockClient)
  })

  afterEach(() => {
    // Restore the real Date.now function
    Date.now = realDateNow

    // Stop the service if it's running
    service.stop()
  })

  describe("findTicketViolators", () => {
    it("should identify players below ticket threshold", () => {
      // Access the private method
      const findTicketViolators = (service as any).findTicketViolators.bind(
        service,
      )

      // Create test data
      const members: ComlinkGuildMember[] = [
        createMember("player1", "Good Player", 600), // No violation
        createMember("player2", "Almost There", 599), // Violation
        createMember("player3", "Slacker", 300), // Violation
        createMember("player4", "New Player", 0), // Violation
      ]

      // Call the method
      const violators: TicketViolator[] = findTicketViolators(members)

      // Verify results
      expect(violators.length).toBe(3)
      expect(
        violators.find((v: TicketViolator) => v.id === "player1"),
      ).toBeUndefined()
      expect(
        violators.find((v: TicketViolator) => v.id === "player2"),
      ).toBeDefined()
      expect(
        violators.find((v: TicketViolator) => v.id === "player3"),
      ).toBeDefined()
      expect(
        violators.find((v: TicketViolator) => v.id === "player4"),
      ).toBeDefined()
    })

    it("should handle members with missing contribution data", () => {
      const findTicketViolators = (service as any).findTicketViolators.bind(
        service,
      )

      // Create test members with minimal required properties
      const members = [
        createMember("player1", "Good Player", 600),
        {
          playerId: "player2",
          playerName: "No Data",
          memberContribution: [] as any[],
        } as unknown as ComlinkGuildMember,
        {
          playerId: "player3",
          playerName: "Missing Contribution",
        } as unknown as ComlinkGuildMember,
      ]

      const violators = findTicketViolators(members)

      expect(violators.length).toBe(2)
      expect(
        violators.find((v: TicketViolator) => v.id === "player2")?.tickets,
      ).toBe(0)
      expect(
        violators.find((v: TicketViolator) => v.id === "player3")?.tickets,
      ).toBe(0)
    })
  })

  describe("handleViolations", () => {
    it("should record violations and send notification when violators exist", async () => {
      // Mock recordViolations to resolve successfully
      mockContainer.ticketViolationClient.recordViolations.mockResolvedValue(
        true,
      )

      // Access the private method
      const handleViolations = (service as any).handleViolations.bind(service)

      // Create test data
      const guildId = "guild123"
      const channelId = "channel456"
      const guildData = {
        guild: {
          profile: {
            name: "Test Guild",
          },
        },
      } as ComlinkGuildData

      const violators: TicketViolator[] = [
        { id: "player1", name: "Player 1", tickets: 500 },
        { id: "player2", name: "Player 2", tickets: 300 },
      ]

      // Spy on private method
      const sendViolationNotificationSpy = jest
        .spyOn(service as any, "sendViolationNotification")
        .mockResolvedValue(undefined)

      // Call the method
      await handleViolations(guildId, channelId, guildData, violators)

      // Verify recordViolations was called with correct data
      expect(
        mockContainer.ticketViolationClient.recordViolations,
      ).toHaveBeenCalledWith(guildId, {
        player1: 500,
        player2: 300,
      })

      // Verify notification was sent
      expect(sendViolationNotificationSpy).toHaveBeenCalledWith(
        channelId,
        "Test Guild",
        violators,
      )

      // Clean up
      sendViolationNotificationSpy.mockRestore()
    })

    it("should not record or send notification when no violators exist", async () => {
      // Access the private method
      const handleViolations = (service as any).handleViolations.bind(service)

      // Create test data
      const guildId = "guild123"
      const channelId = "channel456"
      const guildData = {
        guild: {
          profile: {
            name: "Test Guild",
          },
        },
      } as ComlinkGuildData

      const violators: TicketViolator[] = [] // Empty array

      // Call the method
      await handleViolations(guildId, channelId, guildData, violators)

      // Verify recordViolations was not called
      expect(
        mockContainer.ticketViolationClient.recordViolations,
      ).not.toHaveBeenCalled()

      // Verify log message was output
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("No ticket violations found"),
      )
    })
  })

  describe("ticket reminders", () => {
    it("sends reminder once and tags registered players", async () => {
      const now = Date.now()
      Date.now = jest.fn(() => now)

      const refreshTimestamp = Math.floor(
        (now + 30 * 60 * 1000) / 1000,
      ).toString()

      mockContainer.ticketChannelClient.getAllGuilds.mockResolvedValue([
        {
          guild_id: "guild123",
          ticket_collection_channel_id: "channel456",
          ticket_reminder_channel_id: "reminder789",
          next_ticket_collection_refresh_time: refreshTimestamp,
        },
      ])

      mockContainer.cachedComlinkClient.getGuild.mockResolvedValue({
        guild: {
          member: [
            createMember("player1", "Alpha", 500),
            createMember("player2", "Beta", 450),
          ],
          profile: { name: "Test Guild" },
          nextChallengesRefresh: (parseInt(refreshTimestamp, 10) + 86400).toString(),
        },
      } as unknown as ComlinkGuildData)

      mockContainer.comlinkClient.getPlayer
        .mockResolvedValueOnce({ allyCode: 123456789 })
        .mockResolvedValueOnce({ allyCode: 987654321 })

      mockContainer.playerClient.findDiscordIdByAllyCode
        .mockResolvedValueOnce("discord123")
        .mockResolvedValueOnce(null)

      await (service as any).checkGuildResetTimes()

      expect(mockClient.channels.fetch).toHaveBeenCalledWith(
        "reminder789",
      )
      expect(mockChannel.send).toHaveBeenCalledTimes(1)

      const reminderMessage = mockChannel.send.mock.calls[0][0].content
      expect(reminderMessage).toContain("<@discord123>")
      expect(reminderMessage).toContain("Beta")

      ;(mockChannel.send as jest.Mock).mockClear()
      await (service as any).checkGuildResetTimes()
      expect(mockChannel.send).not.toHaveBeenCalled()
    })
  })

  describe("sendViolationNotification", () => {
    it("should format and send a message with violator data", async () => {
      // Access the private method
      const sendViolationNotification = (
        service as any
      ).sendViolationNotification.bind(service)

      // Create test data
      const channelId = "channel456"
      const guildName = "Test Guild"
      const violators: TicketViolator[] = [
        { id: "player1", name: "Player 1", tickets: 500 },
        { id: "player2", name: "Player 2", tickets: 300 },
      ]

      // Call the method
      await sendViolationNotification(channelId, guildName, violators)

      // Verify channel was fetched
      expect(mockClient.channels.fetch).toHaveBeenCalledWith(channelId)

      // Verify EmbedBuilder was used
      expect(MockEmbedBuilder).toHaveBeenCalled()

      // Verify embed configuration
      expect(mockSetColor).toHaveBeenCalledWith(0xed4245) // Red color
      expect(mockSetTitle).toHaveBeenCalledWith(
        "Ticket Violation Report for Test Guild",
      )
      expect(mockSetDescription).toHaveBeenCalledWith(
        "The following 2 players did not reach 600 daily raid tickets",
      )
      expect(mockSetTimestamp).toHaveBeenCalled()

      // Verify addFields was called for each violator
      expect(mockAddFields).toHaveBeenCalledTimes(2)
      expect(mockSetFooter).toHaveBeenCalledWith({
        text: "Total missing tickets: 400",
      })

      // Verify channel.send was called with the embed
      expect(mockChannel.send).toHaveBeenCalledWith({
        embeds: [expect.anything()],
      })
    })

    it("should handle error when channel is not found", async () => {
      // Access the private method
      const sendViolationNotification = (
        service as any
      ).sendViolationNotification.bind(service)

      // Mock channel fetch to return a non-text channel
      mockClient.channels.fetch.mockResolvedValueOnce({
        isTextBased: jest.fn().mockReturnValue(false),
      })

      // Call the method
      await sendViolationNotification("channel123", "Test Guild", [
        { id: "player1", name: "Player 1", tickets: 500 },
      ])

      // Verify error was logged
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(
          "Channel channel123 not found or not a text channel",
        ),
      )
    })
  })

  describe("checkGuildResetTimes", () => {
    it("should process tickets when close to reset time", async () => {
      // Access the private method
      const checkGuildResetTimes = (service as any).checkGuildResetTimes.bind(
        service,
      )

      // Mock Date.now to return a fixed time
      const now = 1635000000000 // Some fixed timestamp
      Date.now = jest.fn().mockReturnValue(now)

      // Set up mock guild data
      const resetTime = Math.floor(now / 1000) + 60 // 60 seconds in the future
      mockContainer.ticketChannelClient.getAllGuilds.mockResolvedValue([
        {
          guild_id: "guild123",
          ticket_collection_channel_id: "channel456",
          next_ticket_collection_refresh_time: resetTime.toString(),
          anniversary_channel_id: "channel789",
        },
      ])

      // Spy on collectTicketData
      const collectTicketDataSpy = jest
        .spyOn(service as any, "collectTicketData")
        .mockResolvedValue(undefined)

      // Call the method
      await checkGuildResetTimes()

      // Verify collectTicketData was called
      expect(collectTicketDataSpy).toHaveBeenCalledWith(
        "guild123",
        "channel456",
      )

      // Clean up
      collectTicketDataSpy.mockRestore()
    })

    it("should update refresh time when past delay period", async () => {
      // Access the private method
      const checkGuildResetTimes = (service as any).checkGuildResetTimes.bind(
        service,
      )

      // Mock Date.now to return a fixed time
      const now = 1635000000000 // Some fixed timestamp
      Date.now = jest.fn().mockReturnValue(now)

      // Set up mock guild data - refresh time in the past by more than the delay
      const resetTime = Math.floor(now / 1000) - 360 // 6 minutes in the past
      mockContainer.ticketChannelClient.getAllGuilds.mockResolvedValue([
        {
          guild_id: "guild123",
          ticket_collection_channel_id: "channel456",
          next_ticket_collection_refresh_time: resetTime.toString(),
          anniversary_channel_id: "channel789",
        },
      ])

      // Spy on postRefreshOperations
      const handlePostRefreshOperationsSpy = jest
        .spyOn(service as any, "handlePostRefreshOperations")
        .mockResolvedValue(undefined)

      // Call the method
      await checkGuildResetTimes()

      // Verify handlePostRefreshOperations was called
      expect(handlePostRefreshOperationsSpy).toHaveBeenCalledWith(
        "guild123",
        "channel456",
      )

      // Clean up
      handlePostRefreshOperationsSpy.mockRestore()
    })
  })

  describe("start and stop", () => {
    it("should set and clear interval when starting and stopping", () => {
      // Mock setInterval and clearInterval
      const originalSetInterval = global.setInterval
      const originalClearInterval = global.clearInterval

      global.setInterval = jest
        .fn()
        .mockReturnValue(123 as unknown as NodeJS.Timeout)
      global.clearInterval = jest.fn()

      // Start the service
      service.start()

      // Verify setInterval was called
      expect(global.setInterval).toHaveBeenCalled()

      // Stop the service
      service.stop()

      // Verify clearInterval was called
      expect(global.clearInterval).toHaveBeenCalledWith(123)

      // Restore originals
      global.setInterval = originalSetInterval
      global.clearInterval = originalClearInterval
    })
  })
})

// Helper to create a member with ticket contribution
function createMember(
  id: string,
  name: string,
  tickets: number,
): ComlinkGuildMember {
  return {
    playerId: id,
    playerName: name,
    memberContribution: [
      {
        type: 2, // Ticket contribution type
        currentValue: tickets,
      },
    ],
  } as ComlinkGuildMember
}
