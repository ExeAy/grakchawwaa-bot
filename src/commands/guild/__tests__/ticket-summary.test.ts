/* eslint-disable @typescript-eslint/no-explicit-any */
import { container } from "@sapphire/pieces"
import { ChannelType } from "discord.js"
import { ViolationSummaryService } from "../../../services/violation-summary"
import { TicketSummaryCommand } from "../ticket-summary"

// Mock dependencies
jest.mock("@sapphire/framework", () => ({
  Command: class Command {
    constructor() {
      /* empty */
    }
    container = {
      client: {},
    }
  },
}))

jest.mock("@sapphire/pieces", () => ({
  container: {
    playerClient: {
      getPlayer: jest.fn(),
    },
    cachedComlinkClient: {
      getPlayer: jest.fn(),
    },
    ticketChannelClient: {
      getGuildMessageChannels: jest.fn(),
    },
  },
}))

jest.mock("../../../services/violation-summary", () => ({
  ViolationSummaryService: jest.fn().mockImplementation(() => ({
    generateCustomPeriodSummary: jest.fn(),
  })),
}))

jest.mock("../../../discord-bot-client", () => ({
  DiscordBotClient: jest.fn(),
}))

const mockedContainer = jest.mocked(container)
const MockedViolationSummaryService = jest.mocked(ViolationSummaryService)

describe("TicketSummaryCommand", () => {
  let command: TicketSummaryCommand
  let mockInteraction: any
  let mockChannel: any

  beforeEach(() => {
    // Create command instance
    command = new TicketSummaryCommand({} as any, {} as any)

    // Mock channel
    mockChannel = {
      id: "channel123",
      type: ChannelType.GuildText,
    }

    // Mock interaction
    mockInteraction = {
      options: {
        getInteger: jest.fn(),
      },
      channel: mockChannel,
      user: {
        id: "user123",
      },
      reply: jest.fn().mockResolvedValue(undefined),
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
      deferred: false,
    }

    // Reset mocks
    jest.clearAllMocks()
  })

  describe("registerApplicationCommands", () => {
    it("should register the ticket-summary command with correct options", () => {
      const mockRegistry = {
        registerChatInputCommand: jest.fn(),
      }

      command.registerApplicationCommands(mockRegistry as any)

      expect(mockRegistry.registerChatInputCommand).toHaveBeenCalledTimes(1)
      const [builderFn, options] =
        mockRegistry.registerChatInputCommand.mock.calls[0]

      // Test the builder function
      const mockBuilder = {
        setName: jest.fn().mockReturnThis(),
        setDescription: jest.fn().mockReturnThis(),
        addIntegerOption: jest.fn().mockReturnThis(),
      }

      const mockOption = {
        setName: jest.fn().mockReturnThis(),
        setDescription: jest.fn().mockReturnThis(),
        setRequired: jest.fn().mockReturnThis(),
        setMinValue: jest.fn().mockReturnThis(),
        setMaxValue: jest.fn().mockReturnThis(),
      }

      mockBuilder.addIntegerOption.mockImplementation((optionFn) => {
        optionFn(mockOption)
        return mockBuilder
      })

      builderFn(mockBuilder)

      expect(mockBuilder.setName).toHaveBeenCalledWith("ticket-summary")
      expect(mockBuilder.setDescription).toHaveBeenCalledWith(
        "Generate a custom period ticket summary",
      )
      expect(mockOption.setName).toHaveBeenCalledWith("days")
      expect(mockOption.setDescription).toHaveBeenCalledWith(
        "Number of days to include in the summary (1-90)",
      )
      expect(mockOption.setRequired).toHaveBeenCalledWith(true)
      expect(mockOption.setMinValue).toHaveBeenCalledWith(1)
      expect(mockOption.setMaxValue).toHaveBeenCalledWith(90)
      expect(options.idHints).toEqual(["1376565769248444477"])
    })
  })

  describe("chatInputRun", () => {
    it("should return error for invalid days parameter", async () => {
      mockInteraction.options.getInteger.mockReturnValue(null)

      await command.chatInputRun(mockInteraction)

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "Please provide a valid number of days (1-90).",
        ephemeral: true,
      })
    })

    it("should return error for days less than 1", async () => {
      mockInteraction.options.getInteger.mockReturnValue(0)

      await command.chatInputRun(mockInteraction)

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "Please provide a valid number of days (1-90).",
        ephemeral: true,
      })
    })

    it("should return error for days greater than 90", async () => {
      mockInteraction.options.getInteger.mockReturnValue(91)

      await command.chatInputRun(mockInteraction)

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "Please provide a valid number of days (1-90).",
        ephemeral: true,
      })
    })

    it("should return error for invalid channel type", async () => {
      mockInteraction.options.getInteger.mockReturnValue(30)
      mockInteraction.channel = null

      await command.chatInputRun(mockInteraction)

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "This command can only be used in a text channel or DM.",
        ephemeral: true,
      })
    })

    it("should return error for unsupported channel type", async () => {
      mockInteraction.options.getInteger.mockReturnValue(30)
      mockInteraction.channel = {
        type: ChannelType.GuildVoice,
      }

      await command.chatInputRun(mockInteraction)

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "This command can only be used in a text channel or DM.",
        ephemeral: true,
      })
    })

    it("should handle successful ticket summary generation", async () => {
      // Setup valid parameters
      mockInteraction.options.getInteger.mockReturnValue(30)

      // Mock successful guild registration
      mockedContainer.playerClient.getPlayer.mockResolvedValue({
        allyCode: "123456789",
      } as any)
      mockedContainer.cachedComlinkClient.getPlayer.mockResolvedValue({
        guildId: "guild123",
        guildName: "Test Guild",
      } as any)
      mockedContainer.ticketChannelClient.getGuildMessageChannels.mockResolvedValue(
        {
          ticket_collection_channel_id: "channel456",
        } as any,
      )

      // Mock ViolationSummaryService
      const mockSummaryService = {
        generateCustomPeriodSummary: jest.fn().mockResolvedValue(undefined),
      }
      MockedViolationSummaryService.mockImplementation(
        () => mockSummaryService as any,
      )

      await command.chatInputRun(mockInteraction)

      expect(mockInteraction.deferReply).toHaveBeenCalled()
      expect(
        mockSummaryService.generateCustomPeriodSummary,
      ).toHaveBeenCalledWith("guild123", "channel123", "Test Guild", 30)
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: "Ticket summary for the last 30 days has been posted.",
      })
    })

    it("should handle error when player not registered", async () => {
      mockInteraction.options.getInteger.mockReturnValue(30)
      mockedContainer.playerClient.getPlayer.mockResolvedValue(null)

      await command.chatInputRun(mockInteraction)

      expect(mockInteraction.deferReply).toHaveBeenCalled()
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content:
          "You don't have a registered ally code. Please register with `/register-player` first.",
      })
    })

    it("should handle error when player has no ally code", async () => {
      mockInteraction.options.getInteger.mockReturnValue(30)
      mockedContainer.playerClient.getPlayer.mockResolvedValue({} as any)

      await command.chatInputRun(mockInteraction)

      expect(mockInteraction.deferReply).toHaveBeenCalled()
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content:
          "You don't have a registered ally code. Please register with `/register-player` first.",
      })
    })

    it("should handle error when guild data not found", async () => {
      mockInteraction.options.getInteger.mockReturnValue(30)
      mockedContainer.playerClient.getPlayer.mockResolvedValue({
        allyCode: "123456789",
      } as any)
      mockedContainer.cachedComlinkClient.getPlayer.mockResolvedValue(null)

      await command.chatInputRun(mockInteraction)

      expect(mockInteraction.deferReply).toHaveBeenCalled()
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: "Could not find your Star Wars guild data.",
      })
    })

    it("should handle error when guild not registered for tickets", async () => {
      mockInteraction.options.getInteger.mockReturnValue(30)
      mockedContainer.playerClient.getPlayer.mockResolvedValue({
        allyCode: "123456789",
      } as any)
      mockedContainer.cachedComlinkClient.getPlayer.mockResolvedValue({
        guildId: "guild123",
        guildName: "Test Guild",
      } as any)
      mockedContainer.ticketChannelClient.getGuildMessageChannels.mockResolvedValue(
        null,
      )

      await command.chatInputRun(mockInteraction)

      expect(mockInteraction.deferReply).toHaveBeenCalled()
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content:
          "Your Star Wars guild is not registered for ticket collection. Use `/register-ticket-collection` first.",
      })
    })

    it("should handle error when guild has no ticket collection channel", async () => {
      mockInteraction.options.getInteger.mockReturnValue(30)
      mockedContainer.playerClient.getPlayer.mockResolvedValue({
        allyCode: "123456789",
      } as any)
      mockedContainer.cachedComlinkClient.getPlayer.mockResolvedValue({
        guildId: "guild123",
        guildName: "Test Guild",
      } as any)
      mockedContainer.ticketChannelClient.getGuildMessageChannels.mockResolvedValue(
        {} as any,
      )

      await command.chatInputRun(mockInteraction)

      expect(mockInteraction.deferReply).toHaveBeenCalled()
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content:
          "Your Star Wars guild is not registered for ticket collection. Use `/register-ticket-collection` first.",
      })
    })

    it("should handle unexpected errors before defer", async () => {
      mockInteraction.options.getInteger.mockImplementation(() => {
        throw new Error("Unexpected error")
      })

      await command.chatInputRun(mockInteraction)

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content:
          "An error occurred while generating the ticket summary. Please try again later.",
        ephemeral: true,
      })
    })

    it("should handle unexpected errors after defer", async () => {
      mockInteraction.options.getInteger.mockReturnValue(30)
      mockInteraction.deferred = true
      mockedContainer.playerClient.getPlayer.mockRejectedValue(
        new Error("Database error"),
      )

      await command.chatInputRun(mockInteraction)

      expect(mockInteraction.deferReply).toHaveBeenCalled()
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content:
          "An error occurred while generating the ticket summary. Please try again later.",
      })
    })

    it("should work with DM channel", async () => {
      mockInteraction.options.getInteger.mockReturnValue(7)
      mockInteraction.channel = {
        id: "dm123",
        type: ChannelType.DM,
      }

      // Mock successful flow
      mockedContainer.playerClient.getPlayer.mockResolvedValue({
        allyCode: "123456789",
      } as any)
      mockedContainer.cachedComlinkClient.getPlayer.mockResolvedValue({
        guildId: "guild123",
        guildName: "Test Guild",
      } as any)
      mockedContainer.ticketChannelClient.getGuildMessageChannels.mockResolvedValue(
        {
          ticket_collection_channel_id: "channel456",
        } as any,
      )

      const mockSummaryService = {
        generateCustomPeriodSummary: jest.fn().mockResolvedValue(undefined),
      }
      MockedViolationSummaryService.mockImplementation(
        () => mockSummaryService as any,
      )

      await command.chatInputRun(mockInteraction)

      expect(
        mockSummaryService.generateCustomPeriodSummary,
      ).toHaveBeenCalledWith("guild123", "dm123", "Test Guild", 7)
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: "Ticket summary for the last 7 days has been posted.",
      })
    })

    it("should work with GuildAnnouncement channel", async () => {
      mockInteraction.options.getInteger.mockReturnValue(14)
      mockInteraction.channel = {
        id: "announcement123",
        type: ChannelType.GuildAnnouncement,
      }

      // Mock successful flow
      mockedContainer.playerClient.getPlayer.mockResolvedValue({
        allyCode: "123456789",
      } as any)
      mockedContainer.cachedComlinkClient.getPlayer.mockResolvedValue({
        guildId: "guild123",
        guildName: "Test Guild",
      } as any)
      mockedContainer.ticketChannelClient.getGuildMessageChannels.mockResolvedValue(
        {
          ticket_collection_channel_id: "channel456",
        } as any,
      )

      const mockSummaryService = {
        generateCustomPeriodSummary: jest.fn().mockResolvedValue(undefined),
      }
      MockedViolationSummaryService.mockImplementation(
        () => mockSummaryService as any,
      )

      await command.chatInputRun(mockInteraction)

      expect(
        mockSummaryService.generateCustomPeriodSummary,
      ).toHaveBeenCalledWith("guild123", "announcement123", "Test Guild", 14)
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: "Ticket summary for the last 14 days has been posted.",
      })
    })
  })

  describe("getGuildRegistration", () => {
    it("should return success with valid guild registration", async () => {
      mockedContainer.playerClient.getPlayer.mockResolvedValue({
        allyCode: "123456789",
        altAllyCodes: [],
      })
      mockedContainer.cachedComlinkClient.getPlayer.mockResolvedValue({
        guildId: "guild123",
        guildName: "Test Guild",
        name: "Test Player",
        allyCode: 123456789,
        playerId: "player123",
        level: 85,
      })
      mockedContainer.ticketChannelClient.getGuildMessageChannels.mockResolvedValue(
        {
          guild_id: "guild123",
          ticket_collection_channel_id: "channel456",
          next_ticket_collection_refresh_time: "2024-01-01T00:00:00Z",
          anniversary_channel_id: undefined,
        } as any,
      )

      const getGuildRegistration = (command as any).getGuildRegistration.bind(
        command,
      )
      const result = await getGuildRegistration(mockInteraction)

      expect(result).toEqual({
        success: true,
        response: { content: "" },
        guildId: "guild123",
        guildName: "Test Guild",
      })
    })

    it("should return error for missing player", async () => {
      mockedContainer.playerClient.getPlayer.mockResolvedValue(null)

      const getGuildRegistration = (command as any).getGuildRegistration.bind(
        command,
      )
      const result = await getGuildRegistration(mockInteraction)

      expect(result).toEqual({
        success: false,
        response: {
          content:
            "You don't have a registered ally code. Please register with `/register-player` first.",
        },
      })
    })

    it("should return error for missing ally code", async () => {
      mockedContainer.playerClient.getPlayer.mockResolvedValue({} as any)

      const getGuildRegistration = (command as any).getGuildRegistration.bind(
        command,
      )
      const result = await getGuildRegistration(mockInteraction)

      expect(result).toEqual({
        success: false,
        response: {
          content:
            "You don't have a registered ally code. Please register with `/register-player` first.",
        },
      })
    })

    it("should return error for missing guild data", async () => {
      mockedContainer.playerClient.getPlayer.mockResolvedValue({
        allyCode: "123456789",
        altAllyCodes: [],
      } as any)
      mockedContainer.cachedComlinkClient.getPlayer.mockResolvedValue({
        guildId: undefined,
        guildName: undefined,
      } as any)

      const getGuildRegistration = (command as any).getGuildRegistration.bind(
        command,
      )
      const result = await getGuildRegistration(mockInteraction)

      expect(result).toEqual({
        success: false,
        response: {
          content: "Could not find your Star Wars guild data.",
        },
      })
    })

    it("should return error for unregistered guild", async () => {
      mockedContainer.playerClient.getPlayer.mockResolvedValue({
        allyCode: "123456789",
        altAllyCodes: [],
      } as any)
      mockedContainer.cachedComlinkClient.getPlayer.mockResolvedValue({
        guildId: "guild123",
        guildName: "Test Guild",
        name: "Test Player",
        allyCode: 123456789,
        playerId: "player123",
        level: 85,
      } as any)
      mockedContainer.ticketChannelClient.getGuildMessageChannels.mockResolvedValue(
        null,
      )

      const getGuildRegistration = (command as any).getGuildRegistration.bind(
        command,
      )
      const result = await getGuildRegistration(mockInteraction)

      expect(result).toEqual({
        success: false,
        response: {
          content:
            "Your Star Wars guild is not registered for ticket collection. Use `/register-ticket-collection` first.",
        },
      })
    })
  })
})
