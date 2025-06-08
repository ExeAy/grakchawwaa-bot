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
  GET_CUSTOM_PERIOD_VIOLATIONS: `
    SELECT guild_id, date, ticket_counts
    FROM ticketViolations
    WHERE guild_id = $1
      AND date >= NOW() - INTERVAL '$2 days'
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

  /**
   * Process database rows to ensure ticket_counts values are numbers
   */
  private processRows(rows: TicketViolationRow[]): TicketViolationRow[] {
    return rows.map((row) => {
      // Ensure ticket_counts exists and convert string values to numbers
      if (row.ticket_counts) {
        const ticketCounts: Record<string, number> = {}
        for (const [playerId, count] of Object.entries(row.ticket_counts)) {
          ticketCounts[playerId] =
            typeof count === "string" ? parseInt(count, 10) : (count as number)
        }
        return { ...row, ticket_counts: ticketCounts }
      }
      return row
    })
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
      return this.processRows(result.rows)
    } catch (error) {
      console.error("Error getting recent ticket violations:", error)
      return []
    }
  }

  public async getWeeklyViolations(
    guildId: string,
  ): Promise<TicketViolationRow[]> {
    return this.getCustomPeriodViolations(guildId, 7)
  }

  public async getMonthlyViolations(
    guildId: string,
  ): Promise<TicketViolationRow[]> {
    return this.getCustomPeriodViolations(guildId, 30)
  }

  public async getCustomPeriodViolations(
    guildId: string,
    days: number,
  ): Promise<TicketViolationRow[]> {
    if (!guildId || days < 1 || days > 90) {
      console.error("Invalid guild ID or days value")
      return []
    }

    try {
      // For parameterized intervals, we need to build the query dynamically
      const query = `
        SELECT guild_id, date, ticket_counts
        FROM ticketViolations
        WHERE guild_id = $1
          AND date >= NOW() - INTERVAL '${days} days'
        ORDER BY date DESC;
      `
      const result = await this.query<TicketViolationRow>(query, [guildId])
      return this.processRows(result.rows)
    } catch (error) {
      console.error(`Error getting ${days}-day ticket violations:`, error)
      return []
    }
  }
}
