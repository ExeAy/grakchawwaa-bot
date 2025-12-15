import { Command } from "@sapphire/framework"
import { container } from "@sapphire/pieces"
import { ChannelType } from "discord.js"
import { DiscordBotClient } from "../../discord-bot-client"
import { ViolationSummaryService } from "../../services/violation-summary"

export class TicketSummaryCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName("ticket-summary")
          .setDescription("Generate a custom period ticket summary")
          .addIntegerOption((option) =>
            option
              .setName("days")
              .setDescription("Number of days to include in the summary (1-90)")
              .setRequired(true)
              .setMinValue(1)
              .setMaxValue(90),
          ),
      { idHints: ["1376565769248444477"] },
    )
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    try {
      // Get the days parameter
      const days = interaction.options.getInteger("days")
      if (!days || days < 1 || days > 90) {
        return await interaction.reply({
          content: "Please provide a valid number of days (1-90).",
          ephemeral: true,
        })
      }

      // Get the current channel
      const channel = interaction.channel
      if (
        !channel ||
        !(
          channel.type === ChannelType.GuildText ||
          channel.type === ChannelType.DM ||
          channel.type === ChannelType.GuildAnnouncement
        )
      ) {
        return await interaction.reply({
          content: "This command can only be used in a text channel or DM.",
          ephemeral: true,
        })
      }

      // Defer the reply as this may take some time
      await interaction.deferReply()

      // Get guild info from registered data
      const guildRegistration = await this.getGuildRegistration(interaction)
      if (!guildRegistration.success) {
        return await interaction.editReply(guildRegistration.response)
      }

      // Generate the summary
      const client = this.container.client as unknown as DiscordBotClient
      const summaryService = new ViolationSummaryService(client)

      await summaryService.generateCustomPeriodSummary(
        guildRegistration.guildId!,
        channel.id,
        guildRegistration.guildName!,
        days,
      )

      return await interaction.editReply({
        content: `Ticket summary for the last ${days} days has been posted.`,
      })
    } catch (error) {
      console.error("Error in ticket-summary command:", error)

      // If we haven't deferred yet, use reply instead of editReply
      if (!interaction.deferred) {
        return await interaction.reply({
          content:
            "An error occurred while generating the ticket summary. Please try again later.",
          ephemeral: true,
        })
      }

      return await interaction.editReply({
        content:
          "An error occurred while generating the ticket summary. Please try again later.",
      })
    }
  }

  private async getGuildRegistration(
    interaction: Command.ChatInputCommandInteraction,
  ): Promise<{
    success: boolean
    response: { content: string }
    guildId?: string
    guildName?: string
  }> {
    // Get the player's ally code
    const player = await container.playerRepository.getPlayer(interaction.user.id)
    if (!player?.allyCode) {
      return {
        success: false,
        response: {
          content:
            "You don't have a registered ally code. Please register with `/register-player` first.",
        },
      }
    }

    // Get the player's guild data
    const playerData = await container.cachedComlinkClient.getPlayer(
      player.allyCode,
    )
    if (!playerData?.guildId || !playerData?.guildName) {
      return {
        success: false,
        response: {
          content: "Could not find your Star Wars guild data.",
        },
      }
    }

    // Check if the player's SW guild is registered for ticket collection
    const guildSettings =
      await container.guildMessageChannelsRepository.getGuildMessageChannels(
        playerData.guildId,
      )

    if (!guildSettings?.ticketCollectionChannelId) {
      return {
        success: false,
        response: {
          content:
            "Your Star Wars guild is not registered for ticket collection. Use `/register-ticket-collection` first.",
        },
      }
    }

    return {
      success: true,
      response: { content: "" },
      guildId: playerData.guildId,
      guildName: playerData.guildName,
    }
  }
}
