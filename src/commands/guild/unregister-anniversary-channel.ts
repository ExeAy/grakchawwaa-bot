import { Command } from "@sapphire/framework"
import { container } from "@sapphire/pieces"
import { PermissionFlagsBits } from "discord.js"

export class UnregisterAnniversaryChannelCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "unregister-anniversary-channel",
      description: "Unregisters the guild from anniversary notifications",
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName(this.name)
          .setDescription(this.description)
          .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
      { idHints: ["1374809370524782695"] },
    )
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    // First defer the reply to ensure we don't timeout
    await interaction.deferReply()

    try {
      // Get player's ally code
      const playerData = await container.playerRepository.getPlayer(
        interaction.user.id,
      )
      if (!playerData) {
        return interaction.editReply({
          content:
            "You need to register your ally code first using the /register-player command.",
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
            "Only guild leaders and officers can unregister the guild from anniversary notifications.",
        })
      }

      // Check if the guild is registered for anniversary notifications
      const guildChannels =
        await container.guildMessageChannelsRepository.getGuildMessageChannels(
          comlinkGuild.guild.profile.id,
        )
      if (!guildChannels || !guildChannels.anniversaryChannelId) {
        return interaction.editReply({
          content:
            "This guild is not registered for anniversary notifications.",
        })
      }

      // Unregister the guild
      const success =
        await container.guildMessageChannelsRepository.unregisterAnniversaryChannel(
          comlinkPlayer.guildId,
        )
      if (!success) {
        return interaction.editReply({
          content: "Failed to unregister guild. Please try again later.",
        })
      }

      return interaction.editReply({
        content:
          "Successfully unregistered guild from anniversary notifications.",
      })
    } catch (error) {
      console.error("Error in unregister-anniversary-channel command:", error)

      // Make sure we're still responding even if there's an error
      return interaction.editReply({
        content:
          "An error occurred while processing your request. Please try again later.",
      })
    }
  }
}
