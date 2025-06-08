import { container } from "@sapphire/pieces"
import { EmbedBuilder, TextChannel } from "discord.js"
import { TicketViolationRow } from "../db/ticket-violation-client"
import { DiscordBotClient } from "../discord-bot-client"

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

  public async generateCustomPeriodSummary(
    guildId: string,
    channelId: string,
    guildName: string,
    days: number,
  ): Promise<void> {
    try {
      // Validate days parameter
      if (days < 1 || days > 90) {
        console.error(`Invalid days value: ${days}. Must be between 1 and 90.`)
        return
      }

      const violations =
        await container.ticketViolationClient.getCustomPeriodViolations(
          guildId,
          days,
        )
      if (!violations.length) {
        console.log(
          `No violations found for ${days}-day summary for guild ${guildId}`,
        )
        return
      }

      const reportType = `${days}-Day`
      await this.sendSummaryReport(
        channelId,
        guildName,
        violations,
        reportType,
        days,
      )
    } catch (error) {
      console.error(
        `Error generating ${days}-day summary for guild ${guildId}:`,
        error,
      )
    }
  }

  private async sendSummaryReport(
    channelId: string,
    guildName: string,
    violations: TicketViolationRow[],
    reportType: "Weekly" | "Monthly" | string,
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

      // Create main embed with summary information
      const mainEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`${reportType} Ticket Violation Summary for ${guildName}`)
        .setDescription(
          `Period: Last ${daysInPeriod} days\n` +
            `Total Violations Recorded: ${violations.length}`,
        )
        .setTimestamp()

      // Add total guild missing tickets to the main embed
      const totalMissingTickets = sortedStats.reduce(
        (sum, stats) => sum + stats.totalMissingTickets,
        0,
      )
      mainEmbed.addFields({
        name: "Guild Summary",
        value: `Total Guild Missing Tickets: ${totalMissingTickets}`,
      })

      // Send the main embed first
      await channel.send({ embeds: [mainEmbed] })

      // Split player stats into multiple embeds (10 players per embed)
      const playersPerEmbed = 10
      const pageCount = Math.ceil(sortedStats.length / playersPerEmbed)

      for (let page = 1; page <= pageCount; page++) {
        const startIdx = (page - 1) * playersPerEmbed
        const endIdx = Math.min(startIdx + playersPerEmbed, sortedStats.length)
        const pageStats = sortedStats.slice(startIdx, endIdx)

        const playerEmbed = this.createPlayerStatsEmbed(
          pageStats,
          guildName,
          reportType,
          page,
          pageCount,
        )

        await channel.send({ embeds: [playerEmbed] })
      }
    } catch (error) {
      console.error(
        `Error sending ${reportType.toLowerCase()} summary to channel ${channelId}:`,
        error,
      )
    }
  }

  private createPlayerStatsEmbed(
    playerStats: ViolationSummary[],
    guildName: string,
    reportType: "Weekly" | "Monthly" | string,
    page: number,
    totalPages: number,
  ): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`${reportType} Player Ticket Statistics - ${guildName}`)
      .setDescription(`Page ${page} of ${totalPages}`)
      .setTimestamp()

    playerStats.forEach((stats, index) => {
      const position = (page - 1) * 10 + index + 1

      embed.addFields({
        name: `${position}. ${stats.playerName}`,
        value:
          `**Violations:** ${stats.violationCount}\n` +
          `**Avg. Daily Tickets:** ${stats.averageTickets.toFixed(1)}\n` +
          `**Total Missing Tickets:** ${stats.totalMissingTickets}`,
      })
    })

    return embed
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
