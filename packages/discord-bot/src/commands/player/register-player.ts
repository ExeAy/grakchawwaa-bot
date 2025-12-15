import { Command } from "@sapphire/framework"
import { User, userMention } from "discord.js"
import { Player, normalizeAllyCode, sanitizeAllyCodeList } from "@grakchawwaa/core"
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
          )
          .addBooleanOption((option) =>
            option
              .setName("is-alt")
              .setDescription("Mark the ally code as an alternate")
              .setRequired(false),
          )
          .addUserOption((option) =>
            option
              .setName("discord-user")
              .setDescription("Discord user to register")
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
    const targetUser =
      interaction.options.getUser("discord-user") ?? interaction.user
    const targetTag = userMention(targetUser.id)
    const requestedBy =
      targetUser.id === interaction.user.id
        ? null
        : userMention(interaction.user.id)

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

    const existingPlayer = await this.playerOps.getPlayer(targetUser.id)

    if (!existingPlayer) {
      return this.registerNewPlayer({
        interaction,
        allyCode: normalizedAllyCode,
        targetUser,
        targetTag,
        requestedBy,
      })
    }

    return this.updateExistingPlayer({
      interaction,
      allyCode: normalizedAllyCode,
      isAlt,
      targetTag,
      requestedBy,
      existingPlayer,
      targetUser,
    })
  }

  private async registerNewPlayer({
    interaction,
    allyCode,
    targetUser,
    targetTag,
    requestedBy,
  }: {
    interaction: Command.ChatInputCommandInteraction
    allyCode: string
    targetUser: User
    targetTag: string
    requestedBy: string | null
  }) {
    const saveResult = await this.playerOps.addUser(
      targetUser.id,
      allyCode,
      [],
    )

    if (!saveResult) {
      return interaction.reply({
        content: "Failed to save player",
      })
    }

    const baseMessage =
      `Registered player with ally code: ${allyCode} ` +
      `for ${targetTag}`
    const replyMessage = `${baseMessage}${this.formatRequesterNote(
      requestedBy,
    )}.`

    return interaction.reply({
      content: replyMessage,
    })
  }

  private async updateExistingPlayer({
    interaction,
    allyCode,
    isAlt,
    targetTag,
    requestedBy,
    existingPlayer,
    targetUser,
  }: {
    interaction: Command.ChatInputCommandInteraction
    allyCode: string
    isAlt: boolean
    targetTag: string
    requestedBy: string | null
    existingPlayer: Player
    targetUser: User
  }) {
    const primaryAllyCode =
      normalizeAllyCode(existingPlayer.allyCode) ?? allyCode
    const altAllyCodes = sanitizeAllyCodeList(existingPlayer.altAllyCodes)
    const requesterNote = this.formatRequesterNote(requestedBy)

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

      const saveResult = await this.playerOps.addUser(
        targetUser.id,
        primaryAllyCode,
        [...altAllyCodes, allyCode],
      )

      if (!saveResult) {
        return interaction.reply({
          content: "Failed to save player",
        })
      }

      return interaction.reply({
        content:
          `Added alternate ally code ${allyCode} for ${targetTag}` +
          `${requesterNote}.`,
      })
    }

    if (primaryAllyCode === allyCode) {
      return interaction.reply({
        content: "This ally code is already registered as primary.",
      })
    }

    const saveResult = await this.playerOps.addUser(
      targetUser.id,
      allyCode,
      altAllyCodes,
    )

    if (!saveResult) {
      return interaction.reply({
        content: "Failed to save player",
      })
    }

    return interaction.reply({
      content:
        `Updated primary ally code to ${allyCode} for ${targetTag}` +
        `${requesterNote}.`,
    })
  }

  private formatRequesterNote(requestedBy: string | null): string {
    if (!requestedBy) {
      return ""
    }

    return ` (requested by ${requestedBy})`
  }
}
