import { container } from "@sapphire/pieces"
import { ComlinkGuildData, ComlinkGuildMember } from "@swgoh-utils/comlink"
import { EmbedBuilder, TextChannel, userMention } from "discord.js"
import { normalizeAllyCode } from "@grakchawwaa/core"
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
  private reminderSentTimes: Set<string> = new Set()
  private static TICKET_THRESHOLD = 600 // Ticket threshold for violation
  private static CHECK_FREQUENCY = 60 * 1000 // Check every minute
  private static CHECK_BEFORE_RESET = 2 * 60 * 1000 // 2 minutes before reset
  private static REFRESH_UPDATE_DELAY = 5 * 60 * 1000 // 5 minutes wait for refresh update
  private static REMINDER_BEFORE_RESET = 60 * 60 * 1000 // 1 hour before reset
  private isDevMode: boolean
  private static EMBED_FIELD_LIMIT = 25
  private static EMBEDS_PER_MESSAGE = 10
  private playerAllyCodeCache: Map<string, string | null> = new Map()
  private allyCodeDiscordCache: Map<string, string | null> = new Map()

  constructor(
    client: DiscordBotClient,
    summaryService?: ViolationSummaryService,
  ) {
    this.client = client
    this.summaryService = summaryService ?? new ViolationSummaryService(client)
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
    this.reminderSentTimes.clear()
    this.playerAllyCodeCache.clear()
    this.allyCodeDiscordCache.clear()
  }

  private async checkGuildResetTimes(): Promise<void> {
    try {
      // Get all registered guilds
      const guilds = await container.guildMessageChannelsRepository.getAllGuilds()
      const now = Date.now()

      for (const guild of guilds) {
        // Skip guilds without required fields
        if (
          !guild.ticketCollectionChannelId ||
          !guild.nextTicketCollectionRefreshTime
        ) {
          continue
        }

        // Parse the next refresh time
        const refreshTime =
          parseInt(guild.nextTicketCollectionRefreshTime) * 1000 // Convert to milliseconds
        const refreshTimeKey = `${guild.guildId}:${guild.nextTicketCollectionRefreshTime}`

        // In dev mode with forceCheck, process regardless of timing
        if (this.isDevMode) {
          console.log(
            `Development mode: Force checking tickets for guild ${guild.guildId}`,
          )

          if (guild.ticketReminderChannelId) {
            const reminderSent = await this.sendTicketReminder(
              guild.guildId,
              guild.ticketReminderChannelId,
            )

            if (reminderSent) {
              this.reminderSentTimes.add(refreshTimeKey)
            }
          }

          // Process ticket data collection
          await this.collectTicketData(
            guild.guildId,
            guild.ticketCollectionChannelId,
          )

          // Also force run post-refresh operations and summaries
          await this.handlePostRefreshOperations(
            guild.guildId,
            guild.ticketCollectionChannelId,
            true,
          )

          continue
        }

        // Regular production logic below
        // Check if we're within 2 minutes of the reset for ticket collection
        const timeUntilReset = refreshTime - now
        if (
          guild.ticketReminderChannelId &&
          timeUntilReset > 0 &&
          timeUntilReset <= TicketMonitorService.REMINDER_BEFORE_RESET &&
          !this.reminderSentTimes.has(refreshTimeKey)
        ) {
          const reminderSent = await this.sendTicketReminder(
            guild.guildId,
            guild.ticketReminderChannelId,
          )

          if (reminderSent) {
            this.reminderSentTimes.add(refreshTimeKey)
          }
        }

        if (
          timeUntilReset > 0 &&
          timeUntilReset <= TicketMonitorService.CHECK_BEFORE_RESET &&
          !this.processedRefreshTimes.has(refreshTimeKey)
        ) {
          // Mark this refresh time as processed
          this.processedRefreshTimes.add(refreshTimeKey)
          console.log(`Processing tickets for refresh time: ${refreshTimeKey}`)

          // It's time to check ticket counts
          await this.collectTicketData(
            guild.guildId,
            guild.ticketCollectionChannelId,
          )
        }

        // Check if we're 5 minutes past the reset to update next refresh time
        const timeSinceReset = now - refreshTime
        if (timeSinceReset >= TicketMonitorService.REFRESH_UPDATE_DELAY) {
          // For post-refresh operations, we want to run them once when the time is right
          // After updating the refresh time, the old key will no longer match
          await this.handlePostRefreshOperations(
            guild.guildId,
            guild.ticketCollectionChannelId,
          )

          this.processedRefreshTimes.delete(refreshTimeKey)
          this.reminderSentTimes.delete(refreshTimeKey)
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
    if (this.isDevMode) {
      console.log(
        "Skipping live ticket collection (in dev mode)",
      )
      return
    }

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
    try {
      const guildData = await container.cachedComlinkClient.getGuild(
        guildId,
        true,
      )
      if (!guildData?.guild?.member) {
        console.error(`No member data found for guild ${guildId}`)
        return null
      }
      return guildData
    } catch (error) {
      console.error(`Error fetching guild data for ${guildId}:`, error)
      return null
    }
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
      await container.ticketViolationRepository.recordViolations(
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
      await this.sendSuccessNotification(
        channelId,
        guildData.guild.profile.name,
      )
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
      await container.guildMessageChannelsRepository.registerTicketCollectionChannel(
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

  private async sendTicketReminder(
    guildId: string,
    channelId: string,
  ): Promise<boolean> {
    if (!channelId) {
      return false
    }

    try {
      const guildData = await this.fetchGuildData(guildId)
      if (!guildData?.guild?.member?.length) {
        return false
      }

      const violators = this.findTicketViolators(guildData.guild.member)
      if (!violators.length) {
        console.log(`No ticket reminder needed for guild ${guildId}`)
        return true
      }

      const lines = await this.buildReminderLines(violators)
      if (!lines.length) {
        return true
      }

      await this.sendReminderMessage(
        channelId,
        guildData.guild.profile.name,
        lines,
      )
      return true
    } catch (error) {
      console.error(`Error sending ticket reminder for guild ${guildId}:`, error)
      return false
    }
  }

  private async buildReminderLines(
    violators: TicketViolator[],
  ): Promise<string[]> {
    const lines: string[] = []

    for (const [index, violator] of violators.entries()) {
      const label = await this.resolveReminderLabel(violator)
      lines.push(`${index + 1}. ${label} (${violator.tickets}/600)`)
    }

    return lines
  }

  private async resolveReminderLabel(
    violator: TicketViolator,
  ): Promise<string> {
    const allyCode = await this.getAllyCodeForPlayer(violator.id)
    if (!allyCode) {
      return violator.name
    }

    const discordId = await this.findDiscordIdForAllyCode(allyCode)
    if (!discordId) {
      return violator.name
    }

    return userMention(discordId)
  }

  private async getAllyCodeForPlayer(
    playerId: string,
  ): Promise<string | null> {
    if (this.playerAllyCodeCache.has(playerId)) {
      return this.playerAllyCodeCache.get(playerId) ?? null
    }

    try {
      const playerData = await container.comlinkClient.getPlayer(
        undefined,
        playerId,
      )
      const normalized = normalizeAllyCode(playerData?.allyCode)
      this.playerAllyCodeCache.set(playerId, normalized)
      return normalized
    } catch (error) {
      console.error(`Error fetching ally code for player ${playerId}:`, error)
      this.playerAllyCodeCache.set(playerId, null)
      return null
    }
  }

  private async findDiscordIdForAllyCode(
    allyCode: string,
  ): Promise<string | null> {
    if (this.allyCodeDiscordCache.has(allyCode)) {
      return this.allyCodeDiscordCache.get(allyCode) ?? null
    }

    const discordId =
      await container.playerRepository.findDiscordIdByAllyCode(allyCode)
    this.allyCodeDiscordCache.set(allyCode, discordId)
    return discordId
  }

  private async sendReminderMessage(
    channelId: string,
    guildName: string,
    lines: string[],
  ): Promise<void> {
    if (!lines.length) {
      return
    }

    try {
      const channel = (await this.client.channels.fetch(
        channelId,
      )) as TextChannel

      if (!channel || !channel.isTextBased()) {
        console.error(`Reminder channel ${channelId} is invalid`)
        return
      }

      const content = [
        `⏰ Ticket reminder for ${guildName} (1 hour before reset)`,
        "Players below 600 tickets:",
        ...lines,
      ].join("\n")

      await channel.send({ content })
    } catch (error) {
      console.error(
        `Error sending reminder message to channel ${channelId}:`,
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

  private async sendSuccessNotification(
    channelId: string,
    guildName: string,
  ): Promise<void> {
    try {
      const channel = (await this.client.channels.fetch(
        channelId,
      )) as TextChannel
      if (!channel || !channel.isTextBased()) {
        console.error(`Channel ${channelId} not found or not a text channel`)
        return
      }

      const embed = new EmbedBuilder()
        .setColor(0x57f287) // Green color for success
        .setTitle(`🎉 Perfect Ticket Collection for ${guildName}!`)
        .setDescription(
          `Everyone in the guild collected ${TicketMonitorService.TICKET_THRESHOLD} daily raid tickets! Great job, team! 🚀`,
        )
        .setTimestamp()

      await channel.send({ embeds: [embed] })
    } catch (error) {
      console.error(
        `Error sending success notification to channel ${channelId}:`,
        error,
      )
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

      const embeds = this.buildViolationEmbeds(guildName, violators)
      if (!embeds.length) {
        return
      }

      const batches = this.chunkEmbeds(embeds)
      for (const batch of batches) {
        await channel.send({ embeds: batch })
      }
    } catch (error) {
      console.error(
        `Error sending violation notification to channel ${channelId}:`,
        error,
      )
    }
  }

  private buildViolationEmbeds(
    guildName: string,
    violators: TicketViolator[],
  ): EmbedBuilder[] {
    if (!violators.length) {
      return []
    }

    const sortedViolators = [...violators].sort(
      (a, b) => a.tickets - b.tickets,
    )
    const totalMissingTickets = sortedViolators.reduce(
      (sum, violator) => sum + (600 - violator.tickets),
      0,
    )

    const chunkSize = TicketMonitorService.EMBED_FIELD_LIMIT
    const embedChunks: EmbedBuilder[] = []

    for (let index = 0; index < sortedViolators.length; index += chunkSize) {
      const chunk = sortedViolators.slice(index, index + chunkSize)
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle(
          index === 0
            ? `Ticket Violation Report for ${guildName}`
            : `Ticket Violation Report (cont.) - ${guildName}`,
        )
        .setTimestamp()

      if (index === 0) {
        embed
          .setDescription(
            `The following ${violators.length} players did not reach 600 daily raid tickets`,
          )
          .setFooter({
            text: `Total missing tickets: ${totalMissingTickets}`,
          })
      }

      chunk.forEach((violator, position) => {
        const rank = index + position + 1
        embed.addFields({
          name: `${rank}. ${violator.name}`,
          value: `${violator.tickets}/600 tickets`,
          inline: true,
        })
      })

      embedChunks.push(embed)
    }

    return embedChunks
  }

  private chunkEmbeds(
    embeds: EmbedBuilder[],
  ): EmbedBuilder[][] {
    const batches: EmbedBuilder[][] = []
    const batchSize = TicketMonitorService.EMBEDS_PER_MESSAGE

    for (let index = 0; index < embeds.length; index += batchSize) {
      batches.push(embeds.slice(index, index + batchSize))
    }

    return batches
  }
}
