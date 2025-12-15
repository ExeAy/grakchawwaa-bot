import { Entity, PrimaryKey, Property } from "@mikro-orm/core"
import { TicketViolationRepository } from "../repositories/TicketViolationRepository"

@Entity({
  tableName: "ticketViolations",
  repository: () => TicketViolationRepository,
})
export class TicketViolation {
  @PrimaryKey({ fieldName: "guild_id" })
  guildId!: string

  @PrimaryKey()
  date!: Date

  @Property({ fieldName: "ticket_counts", type: "jsonb" })
  ticketCounts!: Record<string, number>
}
