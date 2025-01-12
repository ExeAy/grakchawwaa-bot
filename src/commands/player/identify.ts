import { Command } from "@sapphire/framework"
import { userMention } from "discord.js"
import { getPlayer } from "../../db/players"

export class IdentifyCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder //
          .setName("identify")
          .setDescription("Identify the player and it's ally code"),
      { idHints: ["1328102307581394945"] },
    )
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const userId = interaction.user.id

    const user = await getPlayer(userId)
    if (!user) {
      return interaction.reply({
        content: "Failed to identify player",
      })
    }

    const userCallerToMention = userMention(interaction.user.id)
    return interaction.reply({
      content: `Identified player with ally code: ${user.allyCode} for ${userCallerToMention}`,
    })
  }
}
