import { container } from "@sapphire/pieces"
import { PlayerPGClient } from "./player-client"
import { TicketChannelPGClient } from "./ticket-channel-client"

declare module "@sapphire/pieces" {
  interface Container {
    playerClient: PlayerPGClient
    ticketChannelClient: TicketChannelPGClient
  }
}

export const setupPostgresClients = (): void => {
  const playerClient = new PlayerPGClient()
  const ticketChannelClient = new TicketChannelPGClient()

  container.playerClient = playerClient
  container.ticketChannelClient = ticketChannelClient
}
