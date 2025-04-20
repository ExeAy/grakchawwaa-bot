import { Command } from "@sapphire/framework"
import { container } from "@sapphire/pieces"
import { channelMention, ChannelType } from "discord.js"

export class UnregisterChannelCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName("unregister-channel")
          .setDescription("Unregister a channel from message listening")
          .addChannelOption((option) =>
            option
              .setName("channel")
              .setDescription("The channel to unregister")
              .addChannelTypes(ChannelType.GuildText)
              .setRequired(true),
          ),
      { idHints: ["1363592140055117997"] },
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
    const success = await client.unregisterChannel(channel.id)

    if (!success) {
      return interaction.reply({
        content: "Failed to unregister channel.",
        ephemeral: true,
      })
    }

    return interaction.reply({
      content: `Unregistered channel ${channelMention(channel.id)} from message listening.`,
    })
  }
}
