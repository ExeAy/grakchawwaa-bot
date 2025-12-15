import { Entity, PrimaryKey, Property } from "@mikro-orm/core"
import { PlayerRepository } from "../repositories/PlayerRepository"

@Entity({ tableName: "players", repository: () => PlayerRepository })
export class Player {
  @PrimaryKey({ fieldName: "discord_id" })
  discordId!: string

  @Property({ fieldName: "ally_code", length: 9 })
  allyCode!: string

  @Property({ fieldName: "alt_ally_codes", type: "text[]", default: "{}" })
  altAllyCodes: string[] = []

  @Property({ fieldName: "registered_at" })
  registeredAt: Date = new Date()
}
