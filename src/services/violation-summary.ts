import { container } from "@sapphire/pieces"
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  MessageFlags,
  TextChannel,
} from "discord.js"
import { TicketViolation } from "../entities/TicketViolation.entity"
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

interface SummaryContext {
  guildId: string
  channelId: string
  guildName: string
  violations: TicketViolation[]
  reportLabel: string
  daysInPeriod: number
}

interface SummaryMessageData {
  guildName: string
  reportLabel: string
  daysInPeriod: number
  violationsLogged: number
  totalMissingTickets: number
  playerStats: ViolationSummary[]
}

interface FullSummaryRequest {
  guildId: string
  days: number
  reportLabel: string
  guildName: string
}

export class ViolationSummaryService {
  private client: DiscordBotClient
  private static TICKET_THRESHOLD = 600 // Maximum tickets per day
  private static MAX_TOP_OFFENDERS = 12 // Rows shown in compact summary
  private static FULL_LIST_BUTTON_PREFIX = "ticket-summary-full"
  private static FULL_LIST_FIRST_CHUNK_PLAYERS = 10
  private static FULL_LIST_FOLLOWUP_PLAYERS = 20

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
        await container.ticketViolationRepository.getWeeklyViolations(guildId)
      if (!violations.length) {
        console.log(
          `No violations found for weekly summary for guild ${guildId}`,
        )
        return
      }

      await this.sendSummaryReport({
        guildId,
        channelId,
        guildName,
        violations,
        reportLabel: "Weekly",
        daysInPeriod: 7,
      })
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
        await container.ticketViolationRepository.getMonthlyViolations(guildId)
      if (!violations.length) {
        console.log(
          `No violations found for monthly summary for guild ${guildId}`,
        )
        return
      }

      await this.sendSummaryReport({
        guildId,
        channelId,
        guildName,
        violations,
        reportLabel: "Monthly",
        daysInPeriod: 30,
      })
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
        await container.ticketViolationRepository.getCustomPeriodViolations(
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
      await this.sendSummaryReport({
        guildId,
        channelId,
        guildName,
        violations,
        reportLabel: reportType,
        daysInPeriod: days,
      })
    } catch (error) {
      console.error(
        `Error generating ${days}-day summary for guild ${guildId}:`,
        error,
      )
    }
  }

  private async sendSummaryReport(
    context: SummaryContext,
  ): Promise<void> {
    try {
      const channel = await this.fetchTextChannel(context.channelId)
      if (!channel || !context.violations.length) {
        return
      }

      const { stats: playerStats } = await this.getSortedPlayerStats(
        context.violations,
        context.daysInPeriod,
      )
      if (!playerStats.length) {
        console.log("No player statistics generated for summary report")
        return
      }

      const totalMissingTickets = playerStats.reduce(
        (sum, stats) => sum + stats.totalMissingTickets,
        0,
      )

      const summaryMessage = this.composeSummaryMessage({
        guildName: context.guildName,
        reportLabel: context.reportLabel,
        daysInPeriod: context.daysInPeriod,
        violationsLogged: context.violations.length,
        totalMissingTickets,
        playerStats,
      })

      const buttonRow = this.createFullListButton(context)

      await channel.send({
        content: summaryMessage,
        components: [buttonRow],
      })
    } catch (error) {
      console.error(
        `Error sending ${context.reportLabel.toLowerCase()} summary to channel ${context.channelId}:`,
        error,
      )
    }
  }

  public async handleFullListButton(
    interaction: ButtonInteraction,
  ): Promise<boolean> {
    const request = this.parseFullListCustomId(interaction.customId)
    if (!request) {
      return false
    }

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral })

      const violations =
        await container.ticketViolationRepository.getCustomPeriodViolations(
          request.guildId,
          request.days,
        )

      if (!violations.length) {
        await interaction.editReply(
          "No ticket violations found for this period.",
        )
        return true
      }

      const { stats: playerStats, guildName } =
        await this.getSortedPlayerStats(violations, request.days)

      if (!playerStats.length) {
        await interaction.editReply("No player data available for this period.")
        return true
      }

      const totalMissingTickets = playerStats.reduce(
        (sum, stats) => sum + stats.totalMissingTickets,
        0,
      )

      const responseChunks = this.createFullListChunks({
        guildName: guildName ?? request.guildName,
        reportLabel: `${request.reportLabel} (full list)`,
        daysInPeriod: request.days,
        violationsLogged: violations.length,
        totalMissingTickets,
        playerStats,
      })

      if (!responseChunks.length) {
        await interaction.editReply({
          content: "No ticket data available to display.",
        })
        return true
      }

      await interaction.editReply({ content: responseChunks[0] })

      const remainingChunks = responseChunks.slice(1)
      for (const chunk of remainingChunks) {
        await interaction.followUp({
          content: chunk,
          flags: MessageFlags.Ephemeral,
        })
      }
      return true
    } catch (error) {
      console.error("Error responding to full summary request:", error)
      const message = "Unable to show the full ticket list right now."
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: message })
      } else {
        await interaction.reply({ content: message, ephemeral: true })
      }
      return true
    }
  }

  private async fetchTextChannel(
    channelId: string,
  ): Promise<TextChannel | null> {
    try {
      const channel = (await this.client.channels.fetch(
        channelId,
      )) as TextChannel
      if (!channel || !channel.isTextBased()) {
        console.error(`Channel ${channelId} not found or not a text channel`)
        return null
      }

      return channel
    } catch (error) {
      console.error(`Failed to fetch channel ${channelId}`, error)
      return null
    }
  }

  private async getSortedPlayerStats(
    violations: TicketViolation[],
    daysInPeriod: number,
  ): Promise<{ stats: ViolationSummary[]; guildName: string | null }> {
    if (!violations.length) {
      return { stats: [], guildName: null }
    }

    const firstViolation = violations[0]!
    const guildData = await container.cachedComlinkClient.getGuild(
      firstViolation.guildId,
      true,
    )
    if (!guildData?.guild?.member) {
      console.error("Could not fetch guild data for player names")
      return { stats: [], guildName: null }
    }

    const playerNames = new Map(
      guildData.guild.member.map((member) => [
        member.playerId,
        member.playerName,
      ]),
    )

    const playerStats = this.calculatePlayerStats(
      violations,
      daysInPeriod,
      playerNames,
    )

    return {
      stats: [...playerStats.values()].sort(
        (a, b) => a.averageTickets - b.averageTickets,
      ),
      guildName: guildData.guild.profile?.name ?? null,
    }
  }

  private composeSummaryMessage(
    data: SummaryMessageData,
    maxPlayers = ViolationSummaryService.MAX_TOP_OFFENDERS,
  ): string {
    const displayLimit = Math.max(1, maxPlayers)
    const topPlayers = data.playerStats.slice(0, displayLimit)
    const sections = [this.composeSummaryIntro(data)]

    if (topPlayers.length) {
      sections.push(
        `Top offenders (${topPlayers.length} of ${data.playerStats.length}):`,
        this.formatTopPlayersTable(topPlayers),
      )
    } else {
      sections.push("No offenders recorded in this period.")
    }

    const remaining = data.playerStats.length - topPlayers.length
    if (remaining > 0) {
      const suffix = remaining === 1 ? "player" : "players"
      sections.push(`+ ${remaining} additional ${suffix} omitted`)
    }

    return sections.join("\n\n")
  }

  private composeSummaryIntro(data: SummaryMessageData): string {
    const header =
      `**${data.reportLabel} Ticket Summary - ${data.guildName}**`
    const periodLine = `Period: Last ${data.daysInPeriod} days`
    const totals =
      `Violations logged: ${data.violationsLogged}\n` +
      `Players flagged: ${data.playerStats.length}\n` +
      `Total missing tickets: ${data.totalMissingTickets}`

    return [header, periodLine, totals].join("\n\n")
  }

  private createFullListChunks(data: SummaryMessageData): string[] {
    const intro = this.composeSummaryIntro(data)
    const totalPlayers = data.playerStats.length
    if (!totalPlayers) {
      return [intro]
    }

    const firstChunkPlayers = data.playerStats.slice(
      0,
      ViolationSummaryService.FULL_LIST_FIRST_CHUNK_PLAYERS,
    )
    const remainingPlayers = data.playerStats.slice(
      ViolationSummaryService.FULL_LIST_FIRST_CHUNK_PLAYERS,
    )

    const chunks: string[] = []
    const firstChunkHeader =
      `${intro}\n\nTop offenders (${totalPlayers} of ${totalPlayers}):`
    const firstTable = this.formatTopPlayersTable(firstChunkPlayers, 0)
    chunks.push(`${firstChunkHeader}\n\n${firstTable}`)

    if (remainingPlayers.length) {
      const followUpChunks = this.buildTableChunks(
        remainingPlayers,
        ViolationSummaryService.FULL_LIST_FOLLOWUP_PLAYERS,
        firstChunkPlayers.length,
      )
      chunks.push(...followUpChunks)
    }

    return chunks
  }

  private buildTableChunks(
    players: ViolationSummary[],
    chunkSize: number,
    startIndex = 0,
  ): string[] {
    if (!players.length) {
      return []
    }

    const chunks: string[] = []

    for (let index = 0; index < players.length; index += chunkSize) {
      const slice = players.slice(index, index + chunkSize)
      chunks.push(this.formatTopPlayersTable(slice, startIndex + index))
    }

    return chunks
  }

  private createFullListButton(
    context: SummaryContext,
  ): ActionRowBuilder<ButtonBuilder> {
    const button = new ButtonBuilder()
      .setCustomId(
        this.buildFullListCustomId(
          context.guildId,
          context.daysInPeriod,
          context.reportLabel,
          context.guildName,
        ),
      )
      .setLabel("Show full list")
      .setStyle(ButtonStyle.Secondary)

    return new ActionRowBuilder<ButtonBuilder>().addComponents(button)
  }

  private buildFullListCustomId(
    guildId: string,
    daysInPeriod: number,
    reportLabel: string,
    guildName: string,
  ): string {
    const safeLabel = encodeURIComponent(reportLabel)
    const safeGuildName = encodeURIComponent(
      this.truncateForCustomId(guildName),
    )

    return [
      ViolationSummaryService.FULL_LIST_BUTTON_PREFIX,
      guildId,
      daysInPeriod.toString(),
      safeLabel,
      safeGuildName,
    ].join("|")
  }

  private parseFullListCustomId(
    customId: string,
  ): FullSummaryRequest | null {
    const parts = customId.split("|")
    if (parts.length !== 5) {
      return null
    }

    const prefix = parts[0]!
    const guildId = parts[1]!
    const daysText = parts[2]!
    const encodedLabel = parts[3]!
    const encodedGuildName = parts[4]!

    if (prefix !== ViolationSummaryService.FULL_LIST_BUTTON_PREFIX) {
      return null
    }

    const days = Number(daysText)
    if (!guildId || Number.isNaN(days) || days <= 0) {
      return null
    }

    try {
      return {
        guildId,
        days,
        reportLabel: decodeURIComponent(encodedLabel),
        guildName: decodeURIComponent(encodedGuildName),
      }
    } catch {
      return null
    }
  }

  private truncateForCustomId(value: string, limit = 32): string {
    if (value.length <= limit) {
      return value
    }

    return value.slice(0, limit)
  }

  private formatTopPlayersTable(
    players: ViolationSummary[],
    startIndex = 0,
  ): string {
    const header = "Rank Player              Avg   Missing Viol"

    const lines = players.map((stats, index) => {
      const rank = (startIndex + index + 1).toString().padStart(2, " ")
      const name = this.formatPlayerName(stats.playerName)
      const avg = stats.averageTickets.toFixed(1).padStart(6, " ")
      const missing = stats.totalMissingTickets.toString().padStart(7, " ")
      const violations = stats.violationCount.toString().padStart(4, " ")

      return `${rank}. ${name} ${avg} ${missing} ${violations}`
    })

    return ["```", header, ...lines, "```"].join("\n")
  }

  private formatPlayerName(name: string): string {
    const maxLength = 18
    if (name.length <= maxLength) {
      return name.padEnd(maxLength, " ")
    }

    return `${name.slice(0, maxLength - 3)}...`
  }

  private calculatePlayerStats(
    violations: TicketViolation[],
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
    violations: TicketViolation[],
  ): Map<string, PlayerCounter> {
    const playerCounters = new Map<string, PlayerCounter>()

    // Process each violation record
    for (const violation of violations) {
      // Ensure ticket_counts exists, use empty object as fallback
      const ticketCounts = violation.ticketCounts || {}

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
