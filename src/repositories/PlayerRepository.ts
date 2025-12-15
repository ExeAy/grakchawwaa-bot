import { EntityRepository } from "@mikro-orm/postgresql"
import { User } from "discord.js"
import { Player } from "../entities/Player.entity"
import { normalizeAllyCode } from "../utils/ally-code"

export class PlayerRepository extends EntityRepository<Player> {
  async addUser(discordUser: User, allyCode: string, altAllyCodes?: string[]): Promise<boolean> {
    if (!discordUser?.id || !allyCode) {
      console.error("Invalid player data")
      return false
    }

    console.log("Adding user", discordUser.id, allyCode)

    try {
      let player = await this.findOne({ discordId: discordUser.id })

      if (player) {
        player.allyCode = allyCode
        player.altAllyCodes = altAllyCodes ?? []
      } else {
        player = this.create({
          discordId: discordUser.id,
          allyCode,
          altAllyCodes: altAllyCodes ?? [],
          registeredAt: new Date(),
        })
        this.getEntityManager().persist(player)
      }

      await this.getEntityManager().flush()
      return true
    } catch (error) {
      console.error("Error adding user:", error)
      return false
    }
  }

  async getPlayer(userId: string): Promise<Player | null> {
    if (!userId) {
      console.error("Invalid user ID")
      return null
    }

    try {
      return await this.findOne({ discordId: userId })
    } catch (error) {
      console.error("Error getting player:", error)
      return null
    }
  }

  async removeAllyCode(discordUser: User, allyCode: string): Promise<boolean> {
    if (!discordUser?.id || !allyCode) {
      console.error("Invalid player data")
      return false
    }

    try {
      const player = await this.findOne({ discordId: discordUser.id })

      if (!player) {
        return false
      }

      if (player.allyCode === allyCode) {
        player.allyCode = ""
      }

      if (player.altAllyCodes.includes(allyCode)) {
        player.altAllyCodes = player.altAllyCodes.filter(
          (altAllyCode) => altAllyCode !== allyCode,
        )
      }

      await this.getEntityManager().flush()
      return true
    } catch (error) {
      console.error("Error removing ally code:", error)
      return false
    }
  }

  async removePlayer(discordUser: User): Promise<boolean> {
    if (!discordUser?.id) {
      console.error("Invalid player data")
      return false
    }

    try {
      const player = await this.findOne({ discordId: discordUser.id })

      if (!player) {
        return false
      }

      await this.getEntityManager().removeAndFlush(player)
      return true
    } catch (error) {
      console.error("Error removing player:", error)
      return false
    }
  }

  async findDiscordIdByAllyCode(allyCode: string): Promise<string | null> {
    const normalized = normalizeAllyCode(allyCode)
    if (!normalized) {
      return null
    }

    try {
      const player = await this.findOne({
        $or: [
          { allyCode: normalized },
          { altAllyCodes: { $contains: [normalized] } },
        ],
      })

      return player?.discordId ?? null
    } catch (error) {
      console.error("Error finding discord id by ally code:", error)
      return null
    }
  }
}
