import { User } from "discord.js"
import { Player } from "../entities/Player.entity"

export interface DiscordPlayer {
  player: Player
  discordUser: User
}
