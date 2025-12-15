import { Command } from "@sapphire/framework"
import { container } from "@sapphire/pieces"
import { ComlinkGuildMember } from "@swgoh-utils/comlink"
import { EmbedBuilder } from "discord.js"
import { CachedComlinkClient } from "../../services/comlink/cached-comlink-client"

export class GetGuildMembersCommand extends Command {
  private comlinkClient: CachedComlinkClient

  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
    })
    this.comlinkClient = CachedComlinkClient.getInstance()
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName("get-guild-members")
          .setDescription("Get a list of guild members")
          .addStringOption((option) =>
            option
              .setName("name")
              .setDescription("Filter members by name (not case-sensitive)")
              .setRequired(false),
          ),
      { idHints: ["1374077113417732208", "1374084340669218846"] },
    )
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    try {
      await interaction.deferReply()

      // Get the name filter if provided
      const nameFilter = interaction.options.getString("name")?.toLowerCase()

      // Get the player data to find their guild
      const player = await container.playerRepository.getPlayer(
        interaction.user.id,
      )
      if (!player?.allyCode) {
        return interaction.editReply({
          content:
            "You don't have a registered ally code. Please register with `/register-player` first.",
        })
      }

      // Get player data from comlink to get the guild ID
      const playerData = await container.comlinkClient.getPlayer(
        player.allyCode,
      )
      if (!playerData?.guildId) {
        return interaction.editReply({
          content: "Could not find a guild for your account.",
        })
      }

      // Get guild data with all members
      const guildData = await this.comlinkClient.getGuild(
        playerData.guildId,
        true,
      )
      if (!guildData?.guild?.member || guildData.guild.member.length === 0) {
        return interaction.editReply({
          content: "Could not retrieve guild members.",
        })
      }

      // Filter members by name if a filter was provided
      let members = guildData.guild.member
      if (nameFilter) {
        members = members.filter((member) =>
          member.playerName.toLowerCase().includes(nameFilter),
        )

        if (members.length === 0) {
          return interaction.editReply({
            content: `No members found with name containing "${nameFilter}".`,
          })
        }
      }

      // Format and send the member information
      await this.sendMemberList(
        interaction,
        members,
        playerData.guildName || "Your Guild",
      )
    } catch (error) {
      console.error("Error in get-guild-members command:", error)
      if (!interaction.deferred) {
        return interaction.reply({
          content:
            "An error occurred while processing your request. Please try again later.",
          ephemeral: true,
        })
      }
      return interaction.editReply({
        content:
          "An error occurred while processing your request. Please try again later.",
      })
    }
  }

  private async sendMemberList(
    interaction: Command.ChatInputCommandInteraction,
    members: ComlinkGuildMember[],
    guildName: string,
  ) {
    if (members.length === 0) {
      return interaction.editReply({
        content: "No members found to display.",
      })
    }

    const membersPerEmbed = 10
    const pageCount = Math.ceil(members.length / membersPerEmbed)

    // Create first embed
    const firstEmbed = this.createMemberEmbed(
      members.slice(0, membersPerEmbed),
      guildName,
      1,
      pageCount,
    )

    // Send first embed
    await interaction.editReply({ embeds: [firstEmbed] })

    // Send remaining embeds as follow-ups
    for (let page = 2; page <= pageCount; page++) {
      const startIdx = (page - 1) * membersPerEmbed
      const endIdx = Math.min(startIdx + membersPerEmbed, members.length)
      const pageMembers = members.slice(startIdx, endIdx)

      const embed = this.createMemberEmbed(
        pageMembers,
        guildName,
        page,
        pageCount,
      )

      await interaction.followUp({ embeds: [embed] })
    }
  }

  private createMemberEmbed(
    members: ComlinkGuildMember[],
    guildName: string,
    page: number,
    totalPages: number,
  ): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`${guildName} Members`)
      .setDescription(`Page ${page} of ${totalPages}`)
      .setTimestamp()

    members.forEach((member, index) => {
      const position = (page - 1) * 10 + index + 1

      const formattedGP = member.galacticPower
        ? `${parseInt(member.galacticPower.replace(/,/g, "")).toLocaleString()}`
        : "N/A"

      // Format lastActivityTime as a time ago string
      let lastActivityAgo = "N/A"
      if (member.lastActivityTime) {
        lastActivityAgo = this.formatTimeAgo(
          parseInt(member.lastActivityTime),
          true,
        )
      }

      let joinTime: Date | null = new Date(0)
      if (member.guildJoinTime) {
        joinTime.setUTCSeconds(parseInt(member.guildJoinTime))
      } else {
        joinTime = null
      }

      const formattedJoinTime = joinTime
        ? joinTime.toISOString().slice(0, 10) +
          " " +
          joinTime.toTimeString().slice(0, 5)
        : "N/A"

      embed.addFields({
        name: `${position}. ${member.playerName} (Lvl ${member.playerLevel})`,
        value:
          `**ID:** ${member.playerId}\n` +
          `**GP:** ${formattedGP}\n` +
          `**Last Active:** ${lastActivityAgo}\n` +
          `**Joined Guild:** ${formattedJoinTime}`,
      })
    })

    return embed
  }

  /**
   * Formats time as an "X years, Y days, Z hours, W minutes ago" string
   * @param timestamp Timestamp in seconds or milliseconds
   * @param isMilliseconds Whether the timestamp is in milliseconds
   * @returns Formatted time ago string
   */
  private formatTimeAgo(timestamp: number, isMilliseconds = false): string {
    // Convert milliseconds to seconds if needed
    const timeInSeconds = isMilliseconds
      ? Math.floor(timestamp / 1000)
      : timestamp

    const now = Math.floor(Date.now() / 1000)
    const diff = now - timeInSeconds

    if (diff < 0) {
      return "just now"
    }

    const minutes = Math.floor(diff / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const years = Math.floor(days / 365)

    const remainingDays = days % 365
    const remainingHours = hours % 24
    const remainingMinutes = minutes % 60

    const parts: string[] = []

    if (years > 0) {
      parts.push(`${years} ${years === 1 ? "year" : "years"}`)
    }

    if (remainingDays > 0) {
      parts.push(`${remainingDays} ${remainingDays === 1 ? "day" : "days"}`)
    }

    if (remainingHours > 0) {
      parts.push(`${remainingHours} ${remainingHours === 1 ? "hour" : "hours"}`)
    }

    if (remainingMinutes > 0) {
      parts.push(
        `${remainingMinutes} ${remainingMinutes === 1 ? "minute" : "minutes"}`,
      )
    }

    if (parts.length === 0) {
      return "just now"
    }

    return `${parts.join(", ")} ago`
  }
}
