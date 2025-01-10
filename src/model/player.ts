import { User } from "discord.js"

export interface Player {
  allyCode: string
  altAllyCodes: string[]
}

export interface DiscordPlayer extends Player {
  discordUser: User
}
