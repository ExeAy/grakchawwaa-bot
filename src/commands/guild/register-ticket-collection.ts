import { Command } from "@sapphire/framework"
import { container } from "@sapphire/pieces"
import { channelMention } from "discord.js"

export class RegisterTicketCollectionCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder //
          .setName("register-ticket-collection")
          .setDescription("Register a guild for ticket collection monitoring")
          .addChannelOption((option) =>
            option
              .setName("channel")
              .setDescription("Discord channel to post ticket summaries")
              .setRequired(true),
          )
          .addStringOption((option) =>
            option
              .setName("ally-code")
              .setDescription("Ally code of a guild member (optional)")
              .setRequired(false),
          ),
      { idHints: ["1370692224269942865"] }, // Add command ID hint after registration
    )
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    // Get the channel from the options
    const channel = interaction.options.getChannel("channel")
    if (!channel) {
      return interaction.reply({
        content: "Please provide a valid channel.",
        ephemeral: true,
      })
    }

    // Get the optional ally code or look it up from the player database
    let allyCode = interaction.options.getString("ally-code")?.replace(/-/g, "")

    if (!allyCode) {
      // Look up the ally code for the user from the database
      const player = await container.playerClient.getPlayer(interaction.user.id)
      if (!player || !player.allyCode) {
        return interaction.reply({
          content:
            "You don't have a registered ally code. Please provide an ally code or register with `/register-player`.",
          ephemeral: true,
        })
      }
      allyCode = player.allyCode
    }

    // Get the player data from comlink to find the guild ID
    try {
      await interaction.deferReply()

      const playerData = await container.comlinkClient.getPlayer(allyCode)
      if (!playerData?.guildId) {
        return interaction.editReply({
          content: `Could not find a guild for ally code ${allyCode}. Please make sure the ally code belongs to a guild member.`,
        })
      }

      const guildId = playerData.guildId
      const guildName = playerData.guildName || "Unknown Guild"

      // Register the channel for the guild
      const success = await container.ticketChannelClient.registerChannel(
        guildId,
        channel.id,
      )

      if (!success) {
        return interaction.editReply({
          content:
            "Failed to register ticket collection channel. Please try again later.",
        })
      }

      return interaction.editReply({
        content: `Successfully registered ${channelMention(channel.id)} for ticket collection monitoring for guild: ${guildName}`,
      })
    } catch (error) {
      console.error("Error in register-ticket-collection command:", error)
      return interaction.editReply({
        content:
          "An error occurred while processing your request. Please try again later.",
      })
    }
  }
}
