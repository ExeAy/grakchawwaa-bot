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
          .setName("register-ticket-channel")
          .setDescription("Register a channel for HotBot tickets listening")
          .addChannelOption((option) =>
            option
              .setName("channel")
              .setDescription("The channel to register")
              .addChannelTypes(ChannelType.GuildText)
              .setRequired(true),
          )
          .addStringOption((option) =>
            option
              .setName("filter")
              .setDescription(
                "Optional text to filter messages (only messages containing this text will be processed)",
              )
              .setRequired(false),
          ),
      { idHints: ["1363592140055117996"] },
    )
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const channel = interaction.options.getChannel("channel", true)
    const filter = interaction.options.getString("filter", false)

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
      filter,
    )

    if (!success) {
      return interaction.reply({
        content: "Failed to register channel.",
        ephemeral: true,
      })
    }

    return interaction.reply({
      content: `Registered channel ${channelMention(channel.id)} for message listening.${
        filter ? ` Messages will be filtered for: "${filter}"` : ""
      }`,
    })
  }
}
