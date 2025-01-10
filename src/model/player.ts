import { User } from "discord.js"

export interface Player {
  allyCode?: string
  altAllyCodes?: string[]
  discordUser: User
}
