import { container } from "@sapphire/pieces"
import { ComlinkGuildData, ComlinkGuildMember } from "@swgoh-utils/comlink"
import { TextChannel } from "discord.js"
import { DiscordBotClient } from "../discord-bot-client"

interface MemberAnniversary {
  id: string
  name: string
  years: number
  joinTime: number
}

export class AnniversaryMonitorService {
  private client: DiscordBotClient
  private checkInterval: NodeJS.Timeout | null = null
  private static CHECK_FREQUENCY = 24 * 60 * 60 * 1000 // Check once every 24 hours
  private static CHECK_TIME_HOUR = 12 // Run at noon UTC
  private isDevMode: boolean
  private lastRunDate: Date | null = null

  constructor(client: DiscordBotClient) {
    this.client = client
    this.isDevMode = process.env.NODE_ENV === "development"
  }

  public start(): void {
    console.log(
      `Starting anniversary monitor service in ${this.isDevMode ? "development" : "production"} mode`,
    )

    if (this.isDevMode) {
      // In dev mode, run check once directly
      console.log("Development mode: Running anniversary check once")
      this.checkGuildAnniversaries()
    } else {
      // Schedule the first check at the target hour
      this.scheduleNextCheck()

      // Also set up a daily interval as a backup
      this.checkInterval = setInterval(() => {
        const now = new Date()
        const today = now.toDateString()

        // Only run once per day if we haven't already run today
        if (!this.lastRunDate || this.lastRunDate.toDateString() !== today) {
          this.checkGuildAnniversaries()
        }
      }, AnniversaryMonitorService.CHECK_FREQUENCY)
    }
  }

  private scheduleNextCheck(): void {
    const now = new Date()
    const targetTime = new Date(now)

    // Set the target time to the configured hour
    targetTime.setUTCHours(AnniversaryMonitorService.CHECK_TIME_HOUR, 0, 0, 0)

    // If the target time has already passed today or if this is the first run (lastRunDate is null),
    // schedule for tomorrow to avoid immediate run on startup
    if (now >= targetTime || this.lastRunDate === null) {
      targetTime.setUTCDate(targetTime.getUTCDate() + 1)
    }

    const delay = targetTime.getTime() - now.getTime()

    setTimeout(() => {
      this.checkGuildAnniversaries()
      // Schedule the next check for tomorrow
      this.scheduleNextCheck()
    }, delay)

    console.log(
      `Next anniversary check scheduled for ${targetTime.toISOString()}`,
    )
  }

  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  private async checkGuildAnniversaries(): Promise<void> {
    try {
      console.log("Checking guild member anniversaries")
      this.lastRunDate = new Date()

      // Get all registered guilds
      const guilds = await container.guildMessageChannelsRepository.getAllGuilds()

      for (const guild of guilds) {
        // Only process guilds that have an anniversary channel configured
        if (!guild.anniversaryChannelId) {
          continue
        }

        await this.processGuildAnniversaries(
          guild.guildId,
          guild.anniversaryChannelId,
        )
      }
    } catch (error) {
      console.error("Error checking guild anniversaries:", error)
    }
  }

  private async processGuildAnniversaries(
    guildId: string,
    channelId: string,
  ): Promise<void> {
    try {
      console.log(`Processing anniversaries for guild ${guildId}`)

      const guildData = await this.fetchGuildData(guildId)
      if (!guildData) return

      const anniversaries = this.findAnniversaries(guildData.guild.member || [])

      if (anniversaries.length > 0) {
        await this.sendAnniversaryMessages(
          channelId,
          guildData.guild.profile.name,
          anniversaries,
        )
      } else {
        console.log(`No anniversaries today for guild ${guildId}`)
      }
    } catch (error) {
      console.error(
        `Error processing anniversaries for guild ${guildId}:`,
        error,
      )
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

    guildData.guild.member.push({
      playerId: "123",
      playerName: "Test Player",
      playerLevel: 85,
      memberLevel: 1,
      lastActivityTime: "1684650758",
      squadPower: 1000,
      guildJoinTime: "1684650758",
      galacticPower: "1000",
      playerTitle: "Test Title",
      playerPortrait: "Test Portrait",
      leagueId: "123",
      memberContribution: [],
    })
    return guildData
  }

  private findAnniversaries(
    members: ComlinkGuildMember[],
  ): MemberAnniversary[] {
    const anniversaries: MemberAnniversary[] = []
    const today = new Date()

    for (const member of members) {
      if (!member.guildJoinTime) continue

      // Convert guild join timestamp (which is in seconds) to a Date object
      const joinDate = new Date(0) // Start with epoch
      joinDate.setUTCSeconds(parseInt(member.guildJoinTime))

      // Check if today is the anniversary of the join date
      const isAnniversary =
        today.getUTCMonth() === joinDate.getUTCMonth() &&
        today.getUTCDate() === joinDate.getUTCDate()

      if (isAnniversary) {
        // Calculate years since joining
        const yearsJoined = today.getUTCFullYear() - joinDate.getUTCFullYear()

        // Only celebrate full years (1 year or more)
        if (yearsJoined >= 1) {
          anniversaries.push({
            id: member.playerId,
            name: member.playerName,
            years: yearsJoined,
            joinTime: parseInt(member.guildJoinTime),
          })
        }
      }
    }

    return anniversaries
  }

  private getAnniversaryEmoji(years: number): string {
    // Special emoji handling for significant milestones
    if (years >= 5) return "🏆 🎖️ 🎊"
    if (years >= 3) return "🥂 🎉"
    return "🎂 🎊"
  }

  private getYearText(years: number): string {
    // Make milestone years stand out more
    if (years >= 5) return `${years} YEARS`
    if (years >= 3) return `${years} Years`
    return `${years} Year${years === 1 ? "" : "s"}`
  }

  private async sendAnniversaryMessages(
    channelId: string,
    guildName: string,
    anniversaries: MemberAnniversary[],
  ): Promise<void> {
    try {
      const channel = (await this.client.channels.fetch(
        channelId,
      )) as TextChannel

      if (!channel || !channel.isTextBased()) {
        console.error(`Channel ${channelId} not found or not a text channel`)
        return
      }

      // Sort anniversaries by years (descending) so longest-standing members appear first
      const sortedAnniversaries = [...anniversaries].sort(
        (a, b) => b.years - a.years,
      )

      // Build a text message instead of an embed
      let message = `🎉 **Guild Membership Anniversaries for ${guildName}** 🎉\n\n`

      message += `Today we celebrate ${anniversaries.length} guild member${
        anniversaries.length === 1 ? "" : "s"
      } who joined our ranks on this day in the past!\n\n`

      // Add each member to the message
      sortedAnniversaries.forEach((anniversary) => {
        // Create date from timestamp (seconds)
        const joinDate = new Date(0)
        joinDate.setUTCSeconds(anniversary.joinTime)

        // Format the date in a readable way
        const formattedDate = joinDate.toISOString().slice(0, 10)
        const yearsSinceJoining = `${anniversary.years} year${anniversary.years === 1 ? "" : "s"} ago`

        const emoji = this.getAnniversaryEmoji(anniversary.years)
        const yearText = this.getYearText(anniversary.years)

        message += `${emoji} **${anniversary.name}** - ${yearText} ${emoji}\n`
        message += `Joined on ${formattedDate} (${yearsSinceJoining})\n\n`
      })

      await channel.send({ content: message })
      console.log(
        `Sent anniversary notifications for ${anniversaries.length} members in guild ${guildName}`,
      )
    } catch (error) {
      console.error(
        `Error sending anniversary notifications to channel ${channelId}:`,
        error,
      )
    }
  }
}
