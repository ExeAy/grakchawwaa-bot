import { container } from "@sapphire/pieces"
import { TextChannel } from "discord.js"
import { TicketViolationRow } from "../db/ticket-violation-client"
import { DiscordBotClient } from "../discord-bot-client"
import { sendLongMessage } from "../utils/discord-utils"

interface ViolationSummary {
  playerName: string
  violationCount: number
  averageTickets: number
  totalMissingTickets: number
}

export class ViolationSummaryService {
  private client: DiscordBotClient

  constructor(client: DiscordBotClient) {
    this.client = client
  }

  public async generateWeeklySummary(
    guildId: string,
    channelId: string,
    guildName: string,
  ): Promise<void> {
    try {
      const violations =
        await container.ticketViolationClient.getWeeklyViolations(guildId)
      if (!violations.length) {
        console.log(
          `No violations found for weekly summary for guild ${guildId}`,
        )
        return
      }

      await this.sendSummaryReport(
        channelId,
        guildName,
        violations,
        "Weekly",
        7,
      )
    } catch (error) {
      console.error(
        `Error generating weekly summary for guild ${guildId}:`,
        error,
      )
    }
  }

  public async generateMonthlySummary(
    guildId: string,
    channelId: string,
    guildName: string,
  ): Promise<void> {
    try {
      const violations =
        await container.ticketViolationClient.getMonthlyViolations(guildId)
      if (!violations.length) {
        console.log(
          `No violations found for monthly summary for guild ${guildId}`,
        )
        return
      }

      await this.sendSummaryReport(
        channelId,
        guildName,
        violations,
        "Monthly",
        90, // 3 months
      )
    } catch (error) {
      console.error(
        `Error generating monthly summary for guild ${guildId}:`,
        error,
      )
    }
  }

  private async sendSummaryReport(
    channelId: string,
    guildName: string,
    violations: TicketViolationRow[],
    reportType: "Weekly" | "Monthly",
    daysInPeriod: number,
  ): Promise<void> {
    try {
      const channel = (await this.client.channels.fetch(
        channelId,
      )) as TextChannel
      if (!channel || !channel.isTextBased()) {
        console.error(`Channel ${channelId} not found or not a text channel`)
        return
      }

      if (!violations.length) {
        console.error("No violations provided for summary report")
        return
      }

      const firstViolation = violations[0]!
      // Get guild data to fetch player names
      const guildData = await container.cachedComlinkClient.getGuild(
        firstViolation.guild_id,
        true,
      )
      if (!guildData?.guild?.member) {
        console.error("Could not fetch guild data for player names")
        return
      }

      // Create player ID to name mapping
      const playerNames = new Map(
        guildData.guild.member.map((m) => [m.playerId, m.playerName]),
      )

      // Calculate player statistics
      const playerStats = this.calculatePlayerStats(
        violations,
        daysInPeriod,
        playerNames,
      )

      // Sort players by violation count (descending)
      const sortedStats = [...playerStats.values()].sort(
        (a, b) => b.averageTickets - a.averageTickets,
      )

      // Create the summary message
      let message = `# ${reportType} Ticket Violation Summary for ${guildName}\n\n`
      message += `Period: Last ${daysInPeriod} days\n`
      message += `Total Violations Recorded: ${violations.length}\n\n`
      message += `## Player Statistics\n\n`

      for (const stats of sortedStats) {
        message += `**${stats.playerName}**\n`
        message += `• Violations: ${stats.violationCount}\n`
        message += `• Average Daily Tickets: ${stats.averageTickets.toFixed(1)}\n`
        message += `• Total Missing Tickets: ${stats.totalMissingTickets}\n\n`
      }

      const totalMissingTickets = sortedStats.reduce(
        (sum, stats) => sum + stats.totalMissingTickets,
        0,
      )
      message += `\nTotal Guild Missing Tickets: ${totalMissingTickets}`

      await sendLongMessage(channel, message, {
        preserveFormat: true,
        splitOn: ["\n\n", "\n"],
      })
    } catch (error) {
      console.error(
        `Error sending ${reportType.toLowerCase()} summary to channel ${channelId}:`,
        error,
      )
    }
  }

  private calculatePlayerStats(
    violations: TicketViolationRow[],
    daysInPeriod: number,
    playerNames: Map<string, string>,
  ): Map<string, ViolationSummary> {
    const playerStats = new Map<string, ViolationSummary>()

    // Process each violation record
    for (const violation of violations) {
      for (const playerId of violation.players) {
        const stats = playerStats.get(playerId) || {
          playerName: playerNames.get(playerId) || playerId, // Fallback to ID if name not found
          violationCount: 0,
          averageTickets: 0,
          totalMissingTickets: 0,
        }

        stats.violationCount++
        stats.totalMissingTickets += 600 // Each violation means 600 tickets were not earned
        playerStats.set(playerId, stats)
      }
    }

    // Calculate averages
    for (const stats of playerStats.values()) {
      stats.averageTickets =
        (daysInPeriod * 600 - stats.totalMissingTickets) / daysInPeriod
    }

    return playerStats
  }
}
