import { Pool, QueryResult, QueryResultRow } from "pg"

interface TicketChannelRow extends QueryResultRow {
  guild_id: string
  channel_id: string
}

const QUERIES = {
  REGISTER_CHANNEL: `
    INSERT INTO ticketCollectionChannels (guild_id, channel_id)
    VALUES ($1, $2)
    ON CONFLICT (guild_id) DO UPDATE 
    SET channel_id = $2;
  `,
  GET_CHANNEL: `
    SELECT guild_id, channel_id
    FROM ticketCollectionChannels
    WHERE guild_id = $1;
  `,
} as const

export class TicketChannelPGClient {
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

  public async registerChannel(
    guildId: string,
    channelId: string,
  ): Promise<boolean> {
    if (!guildId || !channelId) {
      console.error("Invalid guild or channel ID")
      return false
    }

    try {
      await this.query(QUERIES.REGISTER_CHANNEL, [guildId, channelId])
      return true
    } catch (error) {
      console.error("Error registering ticket collection channel:", error)
      return false
    }
  }

  public async getChannelForGuild(guildId: string): Promise<string | null> {
    if (!guildId) {
      console.error("Invalid guild ID")
      return null
    }

    try {
      const result = await this.query<TicketChannelRow>(QUERIES.GET_CHANNEL, [
        guildId,
      ])

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return row?.channel_id || null
    } catch (error) {
      console.error("Error getting ticket collection channel:", error)
      return null
    }
  }
}
