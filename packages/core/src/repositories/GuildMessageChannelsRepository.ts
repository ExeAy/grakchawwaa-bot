import { EntityRepository } from "@mikro-orm/postgresql"
import { GuildMessageChannels } from "../entities/GuildMessageChannels.entity"

export class GuildMessageChannelsRepository extends EntityRepository<GuildMessageChannels> {
  async registerTicketCollectionChannel(
    guildId: string,
    channelId: string,
    nextRefreshTime: string,
    reminderChannelId?: string | null,
  ): Promise<boolean> {
    if (!guildId || !channelId || !nextRefreshTime) {
      console.error("Invalid guild, channel ID, or refresh time")
      return false
    }

    try {
      let guild = await this.findOne({ guildId })

      if (guild) {
        guild.ticketCollectionChannelId = channelId
        guild.nextTicketCollectionRefreshTime = nextRefreshTime
        if (reminderChannelId !== undefined) {
          guild.ticketReminderChannelId = reminderChannelId ?? undefined
        }
      } else {
        guild = this.create({
          guildId,
          ticketCollectionChannelId: channelId,
          nextTicketCollectionRefreshTime: nextRefreshTime,
          ticketReminderChannelId: reminderChannelId ?? undefined,
        })
        this.getEntityManager().persist(guild)
      }

      await this.getEntityManager().flush()
      return true
    } catch (error) {
      console.error("Error registering ticket collection channel:", error)
      return false
    }
  }

  async registerAnniversaryChannel(
    guildId: string,
    channelId: string,
  ): Promise<boolean> {
    if (!guildId || !channelId) {
      console.error("Invalid guild or channel ID")
      return false
    }

    try {
      let guild = await this.findOne({ guildId })

      if (guild) {
        guild.anniversaryChannelId = channelId
      } else {
        guild = this.create({
          guildId,
          anniversaryChannelId: channelId,
        })
        this.getEntityManager().persist(guild)
      }

      await this.getEntityManager().flush()
      return true
    } catch (error) {
      console.error("Error registering anniversary channel:", error)
      return false
    }
  }

  async unregisterAnniversaryChannel(guildId: string): Promise<boolean> {
    if (!guildId) {
      console.error("Invalid guild ID")
      return false
    }

    try {
      const guild = await this.findOne({ guildId })

      if (!guild) {
        return false
      }

      guild.anniversaryChannelId = undefined

      await this.getEntityManager().flush()
      return true
    } catch (error) {
      console.error("Error unregistering anniversary channel:", error)
      return false
    }
  }

  async getAllGuilds(): Promise<GuildMessageChannels[]> {
    try {
      return await this.findAll()
    } catch (error) {
      console.error("Error getting all guild ticket collections:", error)
      return []
    }
  }

  async getGuildMessageChannels(
    guildId: string,
  ): Promise<GuildMessageChannels | null> {
    if (!guildId) {
      console.error("Invalid guild ID")
      return null
    }

    try {
      return await this.findOne({ guildId })
    } catch (error) {
      console.error("Error getting guild message channels:", error)
      return null
    }
  }

  async unregisterTicketCollectionChannel(guildId: string): Promise<boolean> {
    if (!guildId) {
      console.error("Invalid guild ID")
      return false
    }

    try {
      const guild = await this.findOne({ guildId })

      if (!guild) {
        return false
      }

      await this.getEntityManager().removeAndFlush(guild)
      return true
    } catch (error) {
      console.error("Error unregistering ticket collection channel:", error)
      return false
    }
  }
}
