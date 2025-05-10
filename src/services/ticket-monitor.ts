import { container } from "@sapphire/pieces"
import { ComlinkGuildData, ComlinkGuildMember } from "@swgoh-utils/comlink"
import { TextChannel } from "discord.js"
import { DiscordBotClient } from "../discord-bot-client"

interface TicketViolator {
  id: string
  name: string
  tickets: number
}

export class TicketMonitorService {
  private client: DiscordBotClient
  private checkInterval: NodeJS.Timeout | null = null
  private static TICKET_THRESHOLD = 600 // Ticket threshold for violation
  private static CHECK_FREQUENCY = 60 * 1000 // Check every minute
  private static CHECK_BEFORE_RESET = 2 * 60 * 1000 // 2 minutes before reset
  private static REFRESH_UPDATE_DELAY = 5 * 60 * 1000 // 5 minutes wait for refresh update

  constructor(client: DiscordBotClient) {
    this.client = client
  }

  public start(): void {
    console.log("Starting ticket monitor service")

    this.checkGuildResetTimes()
    // Check every minute
    this.checkInterval = setInterval(() => {
      this.checkGuildResetTimes()
    }, TicketMonitorService.CHECK_FREQUENCY)
  }

  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  private async checkGuildResetTimes(): Promise<void> {
    try {
      // Get all registered guilds
      const guilds = await container.ticketChannelClient.getAllGuilds()
      const now = Date.now()

      for (const guild of guilds) {
        // Parse the next refresh time
        const refreshTime = parseInt(guild.next_refresh_time) * 1000 // Convert to milliseconds

        // Check if we're within 2 minutes of the reset for ticket collection
        const timeUntilReset = refreshTime - now
        if (
          timeUntilReset > 0 &&
          timeUntilReset <= TicketMonitorService.CHECK_BEFORE_RESET
        ) {
          // It's time to check ticket counts
          await this.collectTicketData(guild.guild_id, guild.channel_id)
        }

        // Check if we're 5 minutes past the reset to update next refresh time
        const timeSinceReset = now - refreshTime
        if (timeSinceReset >= TicketMonitorService.REFRESH_UPDATE_DELAY) {
          await this.updateNextRefreshTime(guild.guild_id, guild.channel_id)
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
    const guildData = await container.comlinkClient.getGuild(guildId, true)
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
      // Store violation data
      const violatorIds = violators.map((v) => v.id)
      await container.ticketViolationClient.recordViolations(
        guildId,
        violatorIds,
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

  private async updateNextRefreshTime(
    guildId: string,
    channelId: string,
  ): Promise<void> {
    try {
      // Fetch the new guild data to get the next refresh time
      const guildData = await container.comlinkClient.getGuild(guildId, true)
      if (!guildData?.guild?.nextChallengesRefresh) {
        console.error(`Failed to get new refresh time for guild ${guildId}`)
        return
      }

      const newRefreshTime = guildData.guild.nextChallengesRefresh
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

      // Create a message with the violators
      let message = `# Ticket Violation Report for ${guildName}\n\n`
      message += `The following ${violators.length} players did not reach 600 daily raid tickets:\n\n`

      const sortedViolators = [...violators].sort(
        (a, b) => a.tickets - b.tickets,
      )

      for (const violator of sortedViolators) {
        message += `**${violator.name}**: ${violator.tickets}/600 tickets\n`
      }

      message += `\nTotal missing tickets: ${sortedViolators.reduce((sum, v) => sum + (600 - v.tickets), 0)}`

      await channel.send(message)
    } catch (error) {
      console.error(
        `Error sending violation notification to channel ${channelId}:`,
        error,
      )
    }
  }
}
