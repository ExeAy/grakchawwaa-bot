import { container } from "@sapphire/pieces"
import { PlayerPGClient } from "./player-client"

declare module "@sapphire/pieces" {
  interface Container {
    playerClient: PlayerPGClient
  }
}

export const setupPostgresClients = (): void => {
  const playerClient = new PlayerPGClient()
  container.playerClient = playerClient
}
