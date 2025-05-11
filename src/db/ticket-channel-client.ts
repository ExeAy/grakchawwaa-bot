import { Pool, QueryResult, QueryResultRow } from "pg"

interface TicketChannelRow extends QueryResultRow {
  guild_id: string
  channel_id: string
  next_refresh_time: string
}

const QUERIES = {
  REGISTER_CHANNEL: `
    INSERT INTO ticketCollectionChannels (guild_id, channel_id, next_refresh_time)
    VALUES ($1, $2, $3)
    ON CONFLICT (guild_id) DO UPDATE 
    SET channel_id = $2, next_refresh_time = $3;
  `,
  GET_CHANNEL: `
    SELECT guild_id, channel_id, next_refresh_time
    FROM ticketCollectionChannels
    WHERE guild_id = $1;
  `,
  GET_ALL_GUILDS: `
    SELECT guild_id, channel_id, next_refresh_time
    FROM ticketCollectionChannels;
  `,
  UNREGISTER_CHANNEL: `
    DELETE FROM ticketCollectionChannels
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
    nextRefreshTime: string,
  ): Promise<boolean> {
    if (!guildId || !channelId || !nextRefreshTime) {
      console.error("Invalid guild, channel ID, or refresh time")
      return false
    }

    try {
      await this.query(QUERIES.REGISTER_CHANNEL, [
        guildId,
        channelId,
        nextRefreshTime,
      ])
      return true
    } catch (error) {
      console.error("Error registering ticket collection channel:", error)
      return false
    }
  }

  public async getGuildData(guildId: string): Promise<TicketChannelRow | null> {
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
      return row || null
    } catch (error) {
      console.error("Error getting ticket collection channel:", error)
      return null
    }
  }

  public async getAllGuilds(): Promise<TicketChannelRow[]> {
    try {
      const result = await this.query<TicketChannelRow>(QUERIES.GET_ALL_GUILDS)
      return result.rows
    } catch (error) {
      console.error("Error getting all guild ticket collections:", error)
      return []
    }
  }

  public async getGuildChannel(
    guildId: string,
  ): Promise<TicketChannelRow | null> {
    if (!guildId) {
      console.error("Invalid guild ID")
      return null
    }

    try {
      const result = await this.query<TicketChannelRow>(QUERIES.GET_CHANNEL, [
        guildId,
      ])
      return result.rows[0] || null
    } catch (error) {
      console.error("Error getting ticket collection channel:", error)
      return null
    }
  }

  public async unregisterChannel(guildId: string): Promise<boolean> {
    if (!guildId) {
      console.error("Invalid guild ID")
      return false
    }

    try {
      await this.query(QUERIES.UNREGISTER_CHANNEL, [guildId])
      return true
    } catch (error) {
      console.error("Error unregistering ticket collection channel:", error)
      return false
    }
  }
}
