import { User } from "discord.js"
import { Player } from "@grakchawwaa/core"

export interface DiscordPlayer {
  player: Player
  discordUser: User
}
