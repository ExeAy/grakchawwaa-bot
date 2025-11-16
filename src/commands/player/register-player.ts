import { Command } from "@sapphire/framework"
import { userMention } from "discord.js"
import { Player } from "../../model/player"
import { PlayerOperationsCommand } from "./player-operations"

const normalizeAllyCode = (
  value: string | null | undefined,
): string | null => {
  if (!value) return null
  const normalized = value.replace(/\D/g, "")
  return normalized.length === 9 ? normalized : null
}

const sanitizeAllyCodes = (codes: string[] | undefined): string[] =>
  (codes ?? [])
    .map((code) => normalizeAllyCode(code))
    .filter((code): code is string => Boolean(code))

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
          )
          .addBooleanOption((option) =>
            option
              .setName("is-alt")
              .setDescription("Mark the ally code as an alternate")
              .setRequired(false),
          ),
      { idHints: ["1328102310261297253"] },
    )
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const allyCodeInput = interaction.options.getString("ally-code")
    const normalizedAllyCode = normalizeAllyCode(allyCodeInput)
    const isAlt = interaction.options.getBoolean("is-alt") ?? false
    const userTag = userMention(interaction.user.id)

    if (!normalizedAllyCode) {
      return interaction.reply({
        content: "Please provide a valid ally code (123-456-789).",
      })
    }

    console.log(
      "Received register player command",
      normalizedAllyCode,
      "isAlt:",
      isAlt,
    )

    const existingPlayer = await this.playerOps.getPlayer(
      interaction.user.id,
    )

    if (!existingPlayer) {
      return this.registerNewPlayer({
        interaction,
        allyCode: normalizedAllyCode,
        userTag,
      })
    }

    return this.updateExistingPlayer({
      interaction,
      allyCode: normalizedAllyCode,
      isAlt,
      userTag,
      existingPlayer,
    })
  }

  private async registerNewPlayer({
    interaction,
    allyCode,
    userTag,
  }: {
    interaction: Command.ChatInputCommandInteraction
    allyCode: string
    userTag: string
  }) {
    const saveResult = await this.playerOps.addUser({
      discordUser: interaction.user,
      allyCode,
      altAllyCodes: [],
    })

    if (!saveResult) {
      return interaction.reply({
        content: "Failed to save player",
      })
    }

    return interaction.reply({
      content: `Registered player with ally code: ${allyCode} for ${userTag}.`,
    })
  }

  private async updateExistingPlayer({
    interaction,
    allyCode,
    isAlt,
    userTag,
    existingPlayer,
  }: {
    interaction: Command.ChatInputCommandInteraction
    allyCode: string
    isAlt: boolean
    userTag: string
    existingPlayer: Player
  }) {
    const primaryAllyCode =
      normalizeAllyCode(existingPlayer.allyCode) ?? allyCode
    const altAllyCodes = sanitizeAllyCodes(existingPlayer.altAllyCodes)

    if (isAlt) {
      if (primaryAllyCode === allyCode) {
        return interaction.reply({
          content: "This ally code is already the primary one.",
        })
      }

      if (altAllyCodes.includes(allyCode)) {
        return interaction.reply({
          content: "This ally code is already registered as an alternate.",
        })
      }

      const saveResult = await this.playerOps.addUser({
        discordUser: interaction.user,
        allyCode: primaryAllyCode,
        altAllyCodes: [...altAllyCodes, allyCode],
      })

      if (!saveResult) {
        return interaction.reply({
          content: "Failed to save player",
        })
      }

      return interaction.reply({
        content: `Added alternate ally code ${allyCode} for ${userTag}.`,
      })
    }

    if (primaryAllyCode === allyCode) {
      return interaction.reply({
        content: "This ally code is already registered as primary.",
      })
    }

    const saveResult = await this.playerOps.addUser({
      discordUser: interaction.user,
      allyCode,
      altAllyCodes,
    })

    if (!saveResult) {
      return interaction.reply({
        content: "Failed to save player",
      })
    }

    return interaction.reply({
      content: `Updated primary ally code to ${allyCode} for ${userTag}.`,
    })
  }
}
