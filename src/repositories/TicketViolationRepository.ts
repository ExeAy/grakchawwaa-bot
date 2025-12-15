import { EntityRepository } from "@mikro-orm/postgresql"
import { TicketViolation } from "../entities/TicketViolation.entity"

export class TicketViolationRepository extends EntityRepository<TicketViolation> {
  async recordViolations(
    guildId: string,
    ticketCounts: Record<string, number>,
  ): Promise<boolean> {
    if (!guildId || Object.keys(ticketCounts).length === 0) {
      console.error("Invalid guild or empty ticket counts")
      return false
    }

    try {
      const violation = this.create({
        guildId,
        date: new Date(),
        ticketCounts,
      })

      await this.getEntityManager().persistAndFlush(violation)
      return true
    } catch (error) {
      console.error("Error recording ticket violations:", error)
      return false
    }
  }

  async getRecentViolations(guildId: string): Promise<TicketViolation[]> {
    if (!guildId) {
      console.error("Invalid guild ID")
      return []
    }

    try {
      return await this.find(
        { guildId },
        {
          orderBy: { date: "DESC" },
          limit: 7,
        },
      )
    } catch (error) {
      console.error("Error getting recent ticket violations:", error)
      return []
    }
  }

  async getWeeklyViolations(guildId: string): Promise<TicketViolation[]> {
    return this.getCustomPeriodViolations(guildId, 7)
  }

  async getMonthlyViolations(guildId: string): Promise<TicketViolation[]> {
    return this.getCustomPeriodViolations(guildId, 30)
  }

  async getCustomPeriodViolations(
    guildId: string,
    days: number,
  ): Promise<TicketViolation[]> {
    if (!guildId || days < 1 || days > 90) {
      console.error("Invalid guild ID or days value")
      return []
    }

    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      return await this.find(
        {
          guildId,
          date: { $gte: startDate },
        },
        {
          orderBy: { date: "DESC" },
        },
      )
    } catch (error) {
      console.error(`Error getting ${days}-day ticket violations:`, error)
      return []
    }
  }
}
