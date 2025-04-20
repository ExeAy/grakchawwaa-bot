import { Command } from "@sapphire/framework"
import { userMention } from "discord.js"
import { PlayerOperationsCommand } from "./player-operations"

export class IdentifyCommand extends Command {
  private playerOps: PlayerOperationsCommand

  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
    })
    this.playerOps = new PlayerOperationsCommand(context, options)
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

    const user = await this.playerOps.getPlayer(userId)
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
