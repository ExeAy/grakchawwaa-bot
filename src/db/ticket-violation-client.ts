import { Pool, QueryResult, QueryResultRow } from "pg"

export interface TicketViolationRow extends QueryResultRow {
  guild_id: string
  date: Date
  ticket_counts: Record<string, number>
}

const QUERIES = {
  RECORD_VIOLATIONS: `
    INSERT INTO ticketViolations (guild_id, date, ticket_counts)
    VALUES ($1, $2, $3);
  `,
  GET_RECENT_VIOLATIONS: `
    SELECT guild_id, date, ticket_counts
    FROM ticketViolations
    WHERE guild_id = $1
    ORDER BY date DESC
    LIMIT 7;
  `,
  GET_WEEKLY_VIOLATIONS: `
    SELECT guild_id, date, ticket_counts
    FROM ticketViolations
    WHERE guild_id = $1
      AND date >= NOW() - INTERVAL '7 days'
    ORDER BY date DESC;
  `,
  GET_MONTHLY_VIOLATIONS: `
    SELECT guild_id, date, ticket_counts
    FROM ticketViolations
    WHERE guild_id = $1
      AND date >= NOW() - INTERVAL '90 days'
    ORDER BY date DESC;
  `,
} as const

export class TicketViolationPGClient {
  private pool: Pool

  constructor() {
    const isProduction = process.env.NODE_ENV === "production"
    const connectionConfig = isProduction
      ? {
          connectionString: process.env.PG_DATABASE_URL,
          ssl: {
            rejectUnauthorized: false,
          },
        }
      : {
          user: process.env.PGUSER,
          host: process.env.PGHOST,
          database: process.env.PGDATABASE,
          password: process.env.PGPASSWORD,
          port: parseInt(process.env.PGPORT || "5432", 10),
        }

    this.pool = new Pool(connectionConfig)

    this.pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err)
    })
  }

  public async disconnect(): Promise<void> {
    await this.pool.end()
  }

  private async query<T extends QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    const client = await this.pool.connect()
    try {
      return await client.query<T>(text, params)
    } finally {
      client.release()
    }
  }

  public async recordViolations(
    guildId: string,
    ticketCounts: Record<string, number>,
  ): Promise<boolean> {
    if (!guildId || Object.keys(ticketCounts).length === 0) {
      console.error("Invalid guild or empty ticket counts")
      return false
    }

    try {
      const now = new Date()
      await this.query(QUERIES.RECORD_VIOLATIONS, [
        guildId,
        now,
        JSON.stringify(ticketCounts),
      ])
      return true
    } catch (error) {
      console.error("Error recording ticket violations:", error)
      return false
    }
  }

  public async getRecentViolations(
    guildId: string,
  ): Promise<TicketViolationRow[]> {
    if (!guildId) {
      console.error("Invalid guild ID")
      return []
    }

    try {
      const result = await this.query<TicketViolationRow>(
        QUERIES.GET_RECENT_VIOLATIONS,
        [guildId],
      )
      return result.rows
    } catch (error) {
      console.error("Error getting recent ticket violations:", error)
      return []
    }
  }

  public async getWeeklyViolations(
    guildId: string,
  ): Promise<TicketViolationRow[]> {
    if (!guildId) {
      console.error("Invalid guild ID")
      return []
    }

    try {
      const result = await this.query<TicketViolationRow>(
        QUERIES.GET_WEEKLY_VIOLATIONS,
        [guildId],
      )
      return result.rows
    } catch (error) {
      console.error("Error getting weekly ticket violations:", error)
      return []
    }
  }

  public async getMonthlyViolations(
    guildId: string,
  ): Promise<TicketViolationRow[]> {
    if (!guildId) {
      console.error("Invalid guild ID")
      return []
    }

    try {
      const result = await this.query<TicketViolationRow>(
        QUERIES.GET_MONTHLY_VIOLATIONS,
        [guildId],
      )
      return result.rows
    } catch (error) {
      console.error("Error getting monthly ticket violations:", error)
      return []
    }
  }
}
