import { container } from "@sapphire/pieces"
import { ChannelPGClient } from "./channel-client"
import { PlayerPGClient } from "./player-client"

declare module "@sapphire/pieces" {
  interface Container {
    playerClient: PlayerPGClient
    channelClient: ChannelPGClient
  }
}

export const setupPostgresClients = (): void => {
  const playerClient = new PlayerPGClient()
  const channelClient = new ChannelPGClient()

  container.playerClient = playerClient
  container.channelClient = channelClient
}
