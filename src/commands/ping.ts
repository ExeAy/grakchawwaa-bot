import { isMessageInstance } from "@sapphire/discord.js-utilities"
import { Command } from "@sapphire/framework"

// 1326258487382245498
export class PingCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "ping",
      aliases: ["pong"],
      description: "Replies with Pong!",
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("ping").setDescription("Ping bot to see if it is alive"),
    )
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const msg = await interaction.reply({
      content: `Pong 🏓!`,
      withResponse: true,
    })

    const message = msg.resource!.message!

    if (isMessageInstance(message)) {
      const diff = message.createdTimestamp - interaction.createdTimestamp
      const ping = Math.round(this.container.client.ws.ping)
      return interaction.editReply(
        `Pong 🏓! (Round trip took: ${diff}ms. Heartbeat: ${ping}ms.)`,
      )
    }

    return interaction.editReply("Failed to retrieve ping :(")
  }
}
