import { container } from "@sapphire/pieces"
import { PlayerPGClient } from "./player-client"
import { TicketChannelPGClient } from "./ticket-channel-client"
import { TicketViolationPGClient } from "./ticket-violation-client"

declare module "@sapphire/pieces" {
  interface Container {
    playerClient: PlayerPGClient
    ticketChannelClient: TicketChannelPGClient
    ticketViolationClient: TicketViolationPGClient
  }
}

export const setupPostgresClients = (): void => {
  const playerClient = new PlayerPGClient()
  const ticketChannelClient = new TicketChannelPGClient()
  const ticketViolationClient = new TicketViolationPGClient()

  container.playerClient = playerClient
  container.ticketChannelClient = ticketChannelClient
  container.ticketViolationClient = ticketViolationClient
}
