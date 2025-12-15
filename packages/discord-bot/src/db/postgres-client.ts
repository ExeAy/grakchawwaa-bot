import { MikroORM } from "@mikro-orm/core"
import { PostgreSqlDriver } from "@mikro-orm/postgresql"
import { container } from "@sapphire/pieces"
import {
  GuildMessageChannels,
  GuildMessageChannelsRepository,
  Player,
  PlayerRepository,
  TicketViolation,
  TicketViolationRepository,
  getORM,
} from "@grakchawwaa/core"

declare module "@sapphire/pieces" {
  interface Container {
    orm: MikroORM<PostgreSqlDriver>
    playerRepository: PlayerRepository
    guildMessageChannelsRepository: GuildMessageChannelsRepository
    ticketViolationRepository: TicketViolationRepository
  }
}

export const setupPostgresClients = (): void => {
  // Setup MikroORM repositories
  const orm = getORM()
  const em = orm.em.fork()
  container.playerRepository = em.getRepository(Player)
  container.guildMessageChannelsRepository = em.getRepository(GuildMessageChannels)
  container.ticketViolationRepository = em.getRepository(TicketViolation)
}
