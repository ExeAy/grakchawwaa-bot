import { Entity, PrimaryKey, Property } from "@mikro-orm/core"
import { GuildMessageChannelsRepository } from "../repositories/GuildMessageChannelsRepository"

@Entity({
  tableName: "guildMessageChannels",
  repository: () => GuildMessageChannelsRepository,
})
export class GuildMessageChannels {
  @PrimaryKey({ fieldName: "guild_id" })
  guildId!: string

  @Property({
    fieldName: "ticket_collection_channel_id",
    nullable: true,
  })
  ticketCollectionChannelId?: string

  @Property({
    fieldName: "next_ticket_collection_refresh_time",
    nullable: true,
  })
  nextTicketCollectionRefreshTime?: string

  @Property({ fieldName: "ticket_reminder_channel_id", nullable: true })
  ticketReminderChannelId?: string

  @Property({ fieldName: "anniversary_channel_id", nullable: true })
  anniversaryChannelId?: string
}
