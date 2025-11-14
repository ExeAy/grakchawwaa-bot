/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComlinkGuildMember } from "@swgoh-utils/comlink"
import { GetGuildMembersCommand } from "../../commands/guild/get-guild-members"

// Mock dependencies
jest.mock("@sapphire/framework", () => ({
  Command: class Command {
    constructor() {
      /* empty */
    }
  },
}))

jest.mock("@sapphire/pieces", () => ({
  container: {
    playerClient: {
      getPlayer: jest.fn(),
    },
    comlinkClient: {
      getPlayer: jest.fn(),
      getGuild: jest.fn(),
    },
  },
}))

jest.mock("../../services/comlink/cached-comlink-client", () => ({
  CachedComlinkClient: {
    getInstance: jest.fn().mockReturnValue({
      getGuild: jest.fn(),
    }),
  },
}))

describe("GetGuildMembersCommand", () => {
  let command: GetGuildMembersCommand
  let formatTimeAgo: (timestamp: number, isMilliseconds?: boolean) => string

  beforeEach(() => {
    // Create command instance
    command = new GetGuildMembersCommand({} as any, {} as any)

    // Access private method
    formatTimeAgo = (command as any).formatTimeAgo.bind(command)

    // Reset mocks
    jest.clearAllMocks()
  })

  describe("formatTimeAgo", () => {
    beforeEach(() => {
      // Mock Date.now to return a fixed timestamp for consistent testing
      jest.spyOn(Date, "now").mockImplementation(() => 1700000000000) // Nov 14, 2023, ~18:13:20 UTC
    })

    afterEach(() => {
      // Restore original Date.now
      jest.spyOn(Date, "now").mockRestore()
    })

    it("should handle milliseconds format", () => {
      // 1 hour ago (in milliseconds)
      const oneHourAgo = 1700000000000 - 60 * 60 * 1000
      const result = formatTimeAgo(oneHourAgo, true)
      expect(result).toBe("1 hour ago")
    })

    it("should handle seconds format", () => {
      // 1 hour ago (in seconds)
      const oneHourAgo = 1700000000 - 60 * 60
      const result = formatTimeAgo(oneHourAgo)
      expect(result).toBe("1 hour ago")
    })

    it("should return 'just now' for future timestamps", () => {
      // 1 hour in the future (seconds)
      const oneHourFuture = 1700000000 + 60 * 60
      const result = formatTimeAgo(oneHourFuture)
      expect(result).toBe("just now")
    })

    it("should format multiple time units correctly", () => {
      // 1 year, 2 days, 3 hours, 4 minutes ago (in seconds)
      const timestamp =
        1700000000 -
        (365 * 24 * 60 * 60 + // 1 year
          2 * 24 * 60 * 60 + // 2 days
          3 * 60 * 60 + // 3 hours
          4 * 60) // 4 minutes
      const result = formatTimeAgo(timestamp)
      expect(result).toBe("1 year, 2 days, 3 hours, 4 minutes ago")
    })

    it("should use singular form for single units", () => {
      // 1 day, 1 hour, 1 minute ago (in seconds)
      const timestamp =
        1700000000 -
        (1 * 24 * 60 * 60 + // 1 day
          1 * 60 * 60 + // 1 hour
          1 * 60) // 1 minute
      const result = formatTimeAgo(timestamp)
      expect(result).toBe("1 day, 1 hour, 1 minute ago")
    })

    it("should use plural form for multiple units", () => {
      // 2 days, 2 hours, 2 minutes ago (in seconds)
      const timestamp =
        1700000000 -
        (2 * 24 * 60 * 60 + // 2 days
          2 * 60 * 60 + // 2 hours
          2 * 60) // 2 minutes
      const result = formatTimeAgo(timestamp)
      expect(result).toBe("2 days, 2 hours, 2 minutes ago")
    })

    it("should show 'just now' for very recent times", () => {
      // 30 seconds ago
      const timestamp = 1700000000 - 30
      const result = formatTimeAgo(timestamp)
      expect(result).toBe("just now")
    })

    it("should handle a mix of singular and plural units", () => {
      // 1 year, 2 days, 1 hour, 2 minutes ago (in seconds)
      const timestamp =
        1700000000 -
        (1 * 365 * 24 * 60 * 60 + // 1 year
          2 * 24 * 60 * 60 + // 2 days
          1 * 60 * 60 + // 1 hour
          2 * 60) // 2 minutes
      const result = formatTimeAgo(timestamp)
      expect(result).toBe("1 year, 2 days, 1 hour, 2 minutes ago")
    })

    it("should handle zero values correctly", () => {
      // 1 year, 0 days, 1 hour, 0 minutes ago (in seconds)
      const timestamp =
        1700000000 -
        (1 * 365 * 24 * 60 * 60 + // 1 year
          0 * 24 * 60 * 60 + // 0 days
          1 * 60 * 60 + // 1 hour
          0 * 60) // 0 minutes
      const result = formatTimeAgo(timestamp)
      expect(result).toBe("1 year, 1 hour ago")
    })
  })

  // Testing createMemberEmbed function
  describe("createMemberEmbed", () => {
    it("should correctly format member data in an embed", () => {
      // Access private method
      const createMemberEmbed =
        (command as any).createMemberEmbed.bind(command)

      // Mock data
      const members: Partial<ComlinkGuildMember>[] = [
        {
          playerId: "player123",
          playerName: "TestPlayer",
          playerLevel: 85,
          lastActivityTime: "1700000000000", // Milliseconds
          galacticPower: "5000000",
          guildJoinTime: "1600000000", // Seconds
        },
      ]

      const guildName = "Test Guild"
      const page = 1
      const totalPages = 1

      // Call the method
      const embed = createMemberEmbed(
        members as ComlinkGuildMember[],
        guildName,
        page,
        totalPages,
      )

      // Verify the embed
      expect(embed.data.title).toBe("Test Guild Members")
      expect(embed.data.description).toBe("Page 1 of 1")
      expect(embed.data.fields).toHaveLength(1)

      // Check field name and content
      const field = embed.data.fields![0]
      expect(field.name).toContain("TestPlayer")
      expect(field.value).toContain("player123")
      expect(field.value).toContain("5,000,000")
    })
  })

  // Testing sendMemberList function
  describe("sendMemberList", () => {
    it("should handle empty members array", async () => {
      const sendMemberList = (command as any).sendMemberList.bind(command)

      // Mock interaction
      const mockInteraction = {
        editReply: jest.fn().mockResolvedValue(undefined),
      }

      // Call with empty array
      await sendMemberList(mockInteraction, [], "Test Guild")

      // Verify appropriate message sent
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: "No members found to display.",
      })
    })

    it("should paginate members correctly", async () => {
      const sendMemberList = (command as any).sendMemberList.bind(command)

      // Mock createMemberEmbed to return a simple object
      jest
        .spyOn(command as any, "createMemberEmbed")
        .mockImplementation(() => ({
          data: { title: "Test" },
        }))

      // Mock interaction
      const mockInteraction = {
        editReply: jest.fn().mockResolvedValue(undefined),
        followUp: jest.fn().mockResolvedValue(undefined),
      }

      // Create 25 mock members
      const members = Array(25)
        .fill(null)
        .map(
          (_, i) =>
            ({
              playerId: `player${i}`,
              playerName: `Player ${i}`,
              playerLevel: 85,
              lastActivityTime: "1700000000000",
              galacticPower: "5000000",
              guildJoinTime: "1600000000",
            }) as unknown as ComlinkGuildMember,
        )

      // Call the method
      await sendMemberList(mockInteraction, members, "Test Guild")

      // Should send first page with editReply
      expect(mockInteraction.editReply).toHaveBeenCalledTimes(1)

      // Should send remaining pages with followUp (total 3 pages for 25 members with 10 per page)
      expect(mockInteraction.followUp).toHaveBeenCalledTimes(2)
    })
  })
})

