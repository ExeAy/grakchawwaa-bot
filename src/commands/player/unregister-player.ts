import { Command } from "@sapphire/framework"
import { userMention } from "discord.js"
import { removeAllyCode, removePlayer } from "../../db/players"

// 1327397640488620146

export class UnregisterPlayerCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("unregister-player")
        .setDescription("Unregister a player or an ally code")
        .addStringOption((option) =>
          option
            .setName("ally-code")
            .setDescription("Ally code to unregister")
            .setRequired(false),
        ),
    )
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const allyCode = interaction.options.getString("ally-code")

    if (allyCode) {
      const saveResult = await removeAllyCode({
        allyCode: allyCode,
        altAllyCodes: [],
        discordUser: interaction.user,
      })

      if (!saveResult) {
        return interaction.reply({
          content: "Failed to unregister ally code",
        })
      }

      const userCallerToMention = userMention(interaction.user.id)

      return interaction.reply({
        content: `Unregistered player with ally code: ${allyCode} for ${userCallerToMention}`,
      })
    }
    const saveResult = await removePlayer({
      discordUser: interaction.user,
      allyCode: "",
      altAllyCodes: [],
    })

    if (!saveResult) {
      return interaction.reply({
        content: "Failed to unregister player",
      })
    }

    const userCallerToMention = userMention(interaction.user.id)
    return interaction.reply({
      content: `Unregistered player ${userCallerToMention} and all associated ally codes`,
    })
  }
}
