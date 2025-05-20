import { container } from "@sapphire/pieces"
import { ComlinkGuildData, ComlinkGuildMember } from "@swgoh-utils/comlink"
import { EmbedBuilder, TextChannel } from "discord.js"
import { DiscordBotClient } from "../discord-bot-client"
import { ViolationSummaryService } from "./violation-summary"

interface TicketViolator {
  id: string
  name: string
  tickets: number
}

export class TicketMonitorService {
  private client: DiscordBotClient
  private summaryService: ViolationSummaryService
  private checkInterval: NodeJS.Timeout | null = null
  private processedRefreshTimes: Set<string> = new Set() // Track processed refresh times
  private static TICKET_THRESHOLD = 600 // Ticket threshold for violation
  private static CHECK_FREQUENCY = 60 * 1000 // Check every minute
  private static CHECK_BEFORE_RESET = 2 * 60 * 1000 // 2 minutes before reset
  private static REFRESH_UPDATE_DELAY = 5 * 60 * 1000 // 5 minutes wait for refresh update
  private isDevMode: boolean

  constructor(client: DiscordBotClient) {
    this.client = client
    this.summaryService = new ViolationSummaryService(client)
    this.isDevMode = process.env.NODE_ENV === "development"
  }

  public start(): void {
    console.log(
      `Starting ticket monitor service in ${this.isDevMode ? "development" : "production"} mode`,
    )

    if (this.isDevMode) {
      // In dev mode, run check once directly
      console.log("Development mode: Running ticket check once")
      this.checkGuildResetTimes()
    } else {
      // In production mode, use interval checks
      this.checkInterval = setInterval(() => {
        this.checkGuildResetTimes()
      }, TicketMonitorService.CHECK_FREQUENCY)
    }
  }

  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    // Clear processed refresh times when stopping
    this.processedRefreshTimes.clear()
  }

  private async checkGuildResetTimes(): Promise<void> {
    try {
      // Get all registered guilds
      const guilds = await container.ticketChannelClient.getAllGuilds()
      const now = Date.now()

      for (const guild of guilds) {
        // Parse the next refresh time
        const refreshTime = parseInt(guild.next_refresh_time) * 1000 // Convert to milliseconds
        const refreshTimeKey = `${guild.guild_id}:${guild.next_refresh_time}`

        // In dev mode with forceCheck, process regardless of timing
        if (this.isDevMode) {
          console.log(
            `Development mode: Force checking tickets for guild ${guild.guild_id}`,
          )

          // Process ticket data collection
          await this.collectTicketData(guild.guild_id, guild.channel_id)

          // Also force run post-refresh operations and summaries
          await this.handlePostRefreshOperations(
            guild.guild_id,
            guild.channel_id,
            true,
          )

          continue
        }

        // Regular production logic below
        // Check if we're within 2 minutes of the reset for ticket collection
        const timeUntilReset = refreshTime - now
        if (
          timeUntilReset > 0 &&
          timeUntilReset <= TicketMonitorService.CHECK_BEFORE_RESET &&
          !this.processedRefreshTimes.has(refreshTimeKey)
        ) {
          // Mark this refresh time as processed
          this.processedRefreshTimes.add(refreshTimeKey)
          console.log(`Processing tickets for refresh time: ${refreshTimeKey}`)

          // It's time to check ticket counts
          await this.collectTicketData(guild.guild_id, guild.channel_id)
        }

        // Check if we're 5 minutes past the reset to update next refresh time
        const timeSinceReset = now - refreshTime
        if (timeSinceReset >= TicketMonitorService.REFRESH_UPDATE_DELAY) {
          // For post-refresh operations, we want to run them once when the time is right
          // After updating the refresh time, the old key will no longer match
          await this.handlePostRefreshOperations(
            guild.guild_id,
            guild.channel_id,
          )

          this.processedRefreshTimes.delete(refreshTimeKey)
        }
      }
    } catch (error) {
      console.error("Error checking guild reset times:", error)
    }
  }

  private async collectTicketData(
    guildId: string,
    channelId: string,
  ): Promise<void> {
    try {
      console.log(`Collecting ticket data for guild ${guildId}`)

      const guildData = await this.fetchGuildData(guildId)
      if (!guildData) return

      const violators = this.findTicketViolators(guildData.guild.member)
      await this.handleViolations(guildId, channelId, guildData, violators)
    } catch (error) {
      console.error(`Error collecting ticket data for guild ${guildId}:`, error)
    }
  }

  private async fetchGuildData(
    guildId: string,
  ): Promise<ComlinkGuildData | null> {
    const guildData = await container.cachedComlinkClient.getGuild(
      guildId,
      true,
    )
    if (!guildData?.guild?.member) {
      console.error(`No member data found for guild ${guildId}`)
      return null
    }
    return guildData
  }

  private findTicketViolators(members: ComlinkGuildMember[]): TicketViolator[] {
    const violators: TicketViolator[] = []

    for (const member of members) {
      const ticketContribution = member.memberContribution?.find(
        (c) => c.type === 2,
      )
      const ticketCount = ticketContribution?.currentValue || 0

      if (ticketCount < TicketMonitorService.TICKET_THRESHOLD) {
        violators.push({
          id: member.playerId,
          name: member.playerName,
          tickets: ticketCount,
        })
      }
    }

    return violators
  }

  private async handleViolations(
    guildId: string,
    channelId: string,
    guildData: ComlinkGuildData,
    violators: TicketViolator[],
  ): Promise<void> {
    if (violators.length > 0) {
      // Create mapping of player ID to ticket count
      const ticketCounts: Record<string, number> = {}

      violators.forEach((v) => {
        ticketCounts[v.id] = v.tickets
      })

      // Store violation data with ticket counts only
      await container.ticketViolationClient.recordViolations(
        guildId,
        ticketCounts,
      )

      // Send notification to the channel
      await this.sendViolationNotification(
        channelId,
        guildData.guild.profile.name,
        violators,
      )
    } else {
      console.log(`No ticket violations found for guild ${guildId}`)
    }
  }

  private async handlePostRefreshOperations(
    guildId: string,
    channelId: string,
    forceSummaries = false,
  ): Promise<void> {
    try {
      const guildData = await this.fetchGuildData(guildId)
      if (!guildData?.guild?.nextChallengesRefresh) {
        console.error(`Failed to get refresh time for guild ${guildId}`)
        return
      }

      // Update the refresh time
      await this.updateNextRefreshTime(
        guildId,
        channelId,
        guildData.guild.nextChallengesRefresh,
      )

      // Generate summaries if needed or forced (in dev mode)
      await this.checkAndGenerateSummaries(
        guildId,
        channelId,
        guildData.guild.profile.name,
        forceSummaries,
      )
    } catch (error) {
      console.error(
        `Error handling post-refresh operations for guild ${guildId}:`,
        error,
      )
    }
  }

  private async updateNextRefreshTime(
    guildId: string,
    channelId: string,
    newRefreshTime: string,
  ): Promise<void> {
    try {
      await container.ticketChannelClient.registerChannel(
        guildId,
        channelId,
        newRefreshTime,
      )

      console.log(
        `Updated next refresh time for guild ${guildId} to ${new Date(
          parseInt(newRefreshTime) * 1000,
        ).toLocaleString()}`,
      )
    } catch (error) {
      console.error(
        `Error updating next refresh time for guild ${guildId}:`,
        error,
      )
    }
  }

  private async checkAndGenerateSummaries(
    guildId: string,
    channelId: string,
    guildName: string,
    forceGenerate = false,
  ): Promise<void> {
    try {
      // In regular operation, check if it's the right day
      const now = new Date()
      const isWeeklySummaryTime = now.getDay() === 0 // Sunday
      const isLastDayOfMonth =
        now.getDate() ===
        new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

      // Generate weekly summary if it's Sunday or forceGenerate is true
      if (isWeeklySummaryTime || forceGenerate) {
        console.log(
          `Generating weekly summary for guild ${guildId}${forceGenerate ? " (forced)" : ""}`,
        )
        await this.summaryService.generateWeeklySummary(
          guildId,
          channelId,
          guildName,
        )
      }

      // Generate monthly summary if it's the last day of the month or forceGenerate is true
      if (isLastDayOfMonth || forceGenerate) {
        console.log(
          `Generating monthly summary for guild ${guildId}${forceGenerate ? " (forced)" : ""}`,
        )
        await this.summaryService.generateMonthlySummary(
          guildId,
          channelId,
          guildName,
        )
      }
    } catch (error) {
      console.error(`Error generating summaries for guild ${guildId}:`, error)
    }
  }

  private async sendViolationNotification(
    channelId: string,
    guildName: string,
    violators: TicketViolator[],
  ): Promise<void> {
    try {
      const channel = (await this.client.channels.fetch(
        channelId,
      )) as TextChannel
      if (!channel || !channel.isTextBased()) {
        console.error(`Channel ${channelId} not found or not a text channel`)
        return
      }

      // Create an embed with the violators
      const embed = new EmbedBuilder()
        .setColor(0xed4245) // Red color for violations
        .setTitle(`Ticket Violation Report for ${guildName}`)
        .setDescription(
          `The following ${violators.length} players did not reach 600 daily raid tickets`,
        )
        .setTimestamp()

      // Sort violators by ticket count (ascending)
      const sortedViolators = [...violators].sort(
        (a, b) => a.tickets - b.tickets,
      )

      // Add each violator to the embed
      sortedViolators.forEach((violator, index) => {
        embed.addFields({
          name: `${index + 1}. ${violator.name}`,
          value: `${violator.tickets}/600 tickets`,
          inline: true,
        })
      })

      // Add total missing tickets
      const totalMissingTickets = sortedViolators.reduce(
        (sum, v) => sum + (600 - v.tickets),
        0,
      )

      embed.addFields({
        name: "Total Missing Tickets",
        value: `${totalMissingTickets}`,
        inline: false,
      })

      await channel.send({ embeds: [embed] })
    } catch (error) {
      console.error(
        `Error sending violation notification to channel ${channelId}:`,
        error,
      )
    }
  }
}
