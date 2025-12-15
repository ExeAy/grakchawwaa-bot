import { container } from "@sapphire/pieces"
import { GuildMessageChannels } from "../entities/GuildMessageChannels.entity"
import { Player } from "../entities/Player.entity"
import { TicketViolation } from "../entities/TicketViolation.entity"
import { GuildMessageChannelsRepository } from "../repositories/GuildMessageChannelsRepository"
import { PlayerRepository } from "../repositories/PlayerRepository"
import { TicketViolationRepository } from "../repositories/TicketViolationRepository"

declare module "@sapphire/pieces" {
  interface Container {
    playerRepository: PlayerRepository
    guildMessageChannelsRepository: GuildMessageChannelsRepository
    ticketViolationRepository: TicketViolationRepository
  }
}

export const setupPostgresClients = (): void => {
  // Setup MikroORM repositories
  const em = container.orm.em.fork()
  container.playerRepository = em.getRepository(Player)
  container.guildMessageChannelsRepository =
    em.getRepository(GuildMessageChannels)
  container.ticketViolationRepository = em.getRepository(TicketViolation)
}
