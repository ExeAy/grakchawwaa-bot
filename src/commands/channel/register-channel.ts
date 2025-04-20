import { Command } from "@sapphire/framework"
import { container } from "@sapphire/pieces"
import { channelMention, ChannelType } from "discord.js"

export class RegisterChannelCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName("register-channel")
          .setDescription("Register a channel for message listening")
          .addChannelOption((option) =>
            option
              .setName("channel")
              .setDescription("The channel to register")
              .addChannelTypes(ChannelType.GuildText)
              .setRequired(true),
          ),
      { idHints: ["1363592140055117996"] },
    )
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const channel = interaction.options.getChannel("channel", true)

    if (!interaction.guildId) {
      return interaction.reply({
        content: "This command can only be used in a guild.",
        ephemeral: true,
      })
    }

    const client = container.channelClient
    const success = await client.registerChannel(
      channel.id,
      interaction.guildId,
    )

    if (!success) {
      return interaction.reply({
        content: "Failed to register channel.",
        ephemeral: true,
      })
    }

    return interaction.reply({
      content: `Registered channel ${channelMention(channel.id)} for message listening.`,
    })
  }
}
