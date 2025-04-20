import { Command } from "@sapphire/framework"
import { userMention } from "discord.js"
import { PlayerOperationsCommand } from "./player-operations"

export class RegisterPlayerCommand extends Command {
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
          .setName("register-player")
          .setDescription("Register a player with an ally code")
          .addStringOption((option) =>
            option
              .setName("ally-code")
              .setDescription("Ally code to register")
              .setRequired(true),
          ),
      { idHints: ["1328102310261297253"] },
    )
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const allyCode = interaction.options
      .getString("ally-code")
      ?.replace(/-/g, "")

    console.log("Received register player command", allyCode)

    const saveResult = await this.playerOps.addUser({
      discordUser: interaction.user,
      allyCode: allyCode!,
      altAllyCodes: [],
    })

    if (!saveResult) {
      return interaction.reply({
        content: "Failed to save player",
      })
    }

    const userCallerToMention = userMention(interaction.user.id)

    return interaction.reply({
      content: `Registered player with ally code: ${allyCode} for ${userCallerToMention}`,
    })
  }
}
