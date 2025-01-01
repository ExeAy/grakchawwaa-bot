export interface KVNamespace {
  get(key: string): Promise<unknown>
  put(key: string, value: unknown): Promise<void>
}

export interface Environment {
  DISCORD_PUBLIC_KEY: string
  DISCORD_APPLICATION_ID: string
  DISCORD_TOKEN: string
  PORT: string
  PLAYERS_BINDING: KVNamespace
}
