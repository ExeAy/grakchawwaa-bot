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

interface PlayerCounter {
  violations: number
  ticketSum: number
}

export class ViolationSummaryService {
  private client: DiscordBotClient
  private static TICKET_THRESHOLD = 600 // Maximum tickets per day

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
        30,
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

      // Sort players by average tickets (ascending) to show worst offenders first
      const sortedStats = [...playerStats.values()].sort(
        (a, b) => a.averageTickets - b.averageTickets,
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
    // Collect raw data about player violations
    const playerCounters = this.collectViolationCounts(violations)

    // Transform raw data into summary statistics
    return this.transformCountersToStats(
      playerCounters,
      daysInPeriod,
      playerNames,
    )
  }

  /**
   * Collect counts of violations, tickets, and days for each player
   */
  private collectViolationCounts(
    violations: TicketViolationRow[],
  ): Map<string, PlayerCounter> {
    const playerCounters = new Map<string, PlayerCounter>()

    // Process each violation record
    for (const violation of violations) {
      // Ensure ticket_counts exists, use empty object as fallback
      const ticketCounts = violation.ticket_counts || {}

      // Process each player in the ticket_counts object
      for (const playerId of Object.keys(ticketCounts)) {
        // Get or initialize player counter
        const counter = playerCounters.get(playerId) || {
          violations: 0,
          ticketSum: 0,
        }

        // Update counter
        counter.violations += 1
        counter.ticketSum += ticketCounts[playerId] || 0

        // Store updated counter
        playerCounters.set(playerId, counter)
      }
    }

    return playerCounters
  }

  /**
   * Transform raw player counters into calculated violation statistics
   */
  private transformCountersToStats(
    playerCounters: Map<string, PlayerCounter>,
    daysInPeriod: number,
    playerNames: Map<string, string>,
  ): Map<string, ViolationSummary> {
    const playerStats = new Map<string, ViolationSummary>()

    for (const [playerId, counter] of playerCounters.entries()) {
      // Skip players with no violations
      if (counter.violations === 0) continue

      // Skip players without a player name
      if (!playerNames.has(playerId)) continue

      // Calculate missing tickets based on actual tickets collected
      const missingTickets = this.calculateMissingTickets(counter)

      // Calculate average tickets per day across the period
      const averageTickets = this.calculateAverageTickets(counter, daysInPeriod)

      // Create the player's violation summary
      playerStats.set(playerId, {
        playerName: playerNames.get(playerId)!,
        violationCount: counter.violations,
        averageTickets,
        totalMissingTickets: missingTickets,
      })
    }

    return playerStats
  }

  /**
   * Calculate how many tickets a player missed during their violation days
   */
  private calculateMissingTickets(counter: PlayerCounter): number {
    return (
      counter.violations * ViolationSummaryService.TICKET_THRESHOLD -
      counter.ticketSum
    )
  }

  /**
   * Calculate average daily ticket contribution over the entire period
   * Only counts days with violations and caps at TICKET_THRESHOLD
   */
  private calculateAverageTickets(
    counter: PlayerCounter,
    daysInPeriod: number,
  ): number {
    const maxTickets = daysInPeriod * ViolationSummaryService.TICKET_THRESHOLD
    const totalMissingTickets = this.calculateMissingTickets(counter)
    const totalTickets = maxTickets - totalMissingTickets
    return totalTickets / daysInPeriod
  }
}
