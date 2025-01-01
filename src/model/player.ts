export interface DiscordUser {
  id: string
  username?: string
  global_name?: string
}

export interface Player {
  allyCode: string
  altAllyCodes?: string[]
  discordUser: DiscordUser
}
