import { Command } from "@sapphire/framework"
import { container } from "@sapphire/pieces"
import { PermissionFlagsBits } from "discord.js"

export class UnregisterTicketCollectionCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "unregister-ticket-collection",
      description: "Unregisters the guild from ticket collection monitoring",
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName(this.name)
          .setDescription(this.description)
          .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
      { idHints: ["1371170913122517124"] },
    )
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    try {
      await interaction.deferReply()

      // Get player's ally code
      const playerData = await container.playerRepository.getPlayer(
        interaction.user.id,
      )
      if (!playerData) {
        return interaction.editReply({
          content:
            "You need to register your ally code first using the /register command.",
        })
      }

      // Get player info from comlink
      const comlinkPlayer = await container.cachedComlinkClient.getPlayer(
        playerData.allyCode,
      )
      if (!comlinkPlayer) {
        return interaction.editReply({
          content:
            "Could not verify your player information. Please try again later.",
        })
      }

      // Get guild info from comlink
      if (!comlinkPlayer.guildId) {
        return interaction.editReply({
          content: "You must be in a guild to use this command.",
        })
      }

      const comlinkGuild = await container.cachedComlinkClient.getGuild(
        comlinkPlayer.guildId,
        false,
      )
      if (!comlinkGuild?.guild?.member) {
        return interaction.editReply({
          content:
            "Could not verify your guild information. Please try again later.",
        })
      }

      // Find the player in the guild and check their role
      const guildMember = comlinkGuild.guild.member.find(
        (m) => m.playerId === comlinkPlayer.playerId,
      )
      if (!guildMember || guildMember.memberLevel < 3) {
        return interaction.editReply({
          content:
            "Only guild leaders and officers can unregister the guild from ticket monitoring.",
        })
      }

      // Check if the guild is registered for monitoring
      const monitoringData =
        await container.guildMessageChannelsRepository.getGuildMessageChannels(
          comlinkGuild.guild.profile.id,
        )
      if (!monitoringData) {
        return interaction.editReply({
          content:
            "This guild is not registered for ticket collection monitoring.",
        })
      }

      // Unregister the guild
      const success =
        await container.guildMessageChannelsRepository.unregisterTicketCollectionChannel(
          comlinkPlayer.guildId,
        )
      if (!success) {
        return interaction.editReply({
          content: "Failed to unregister guild. Please try again later.",
        })
      }

      return interaction.editReply({
        content:
          "Successfully unregistered guild from ticket collection monitoring.",
      })
    } catch (error) {
      console.error("Error in unregister-ticket-collection command:", error)
      return interaction.editReply({
        content:
          "An error occurred while processing your request. Please try again later.",
      })
    }
  }
}
