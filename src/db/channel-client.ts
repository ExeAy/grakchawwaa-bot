import { Pool, QueryResult, QueryResultRow } from "pg"

interface ChannelRow extends QueryResultRow {
  channel_id: string
  guild_id: string
  registered_at: Date
}

export class ChannelPGClient {
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
    channelId: string,
    guildId: string,
  ): Promise<boolean> {
    try {
      await this.query(
        `INSERT INTO channels (channel_id, guild_id)
        VALUES ($1, $2)
        ON CONFLICT (channel_id) DO NOTHING;`,
        [channelId, guildId],
      )
      return true
    } catch (error) {
      console.error("Error registering channel:", error)
      return false
    }
  }

  public async unregisterChannel(channelId: string): Promise<boolean> {
    try {
      await this.query(
        `DELETE FROM channels
        WHERE channel_id = $1;`,
        [channelId],
      )
      return true
    } catch (error) {
      console.error("Error unregistering channel:", error)
      return false
    }
  }

  public async isChannelRegistered(channelId: string): Promise<boolean> {
    try {
      const result = await this.query<ChannelRow>(
        `SELECT channel_id
        FROM channels
        WHERE channel_id = $1;`,
        [channelId],
      )
      return result.rows.length > 0
    } catch (error) {
      console.error("Error checking channel registration:", error)
      return false
    }
  }

  public async getRegisteredChannels(): Promise<string[]> {
    try {
      const result = await this.query<ChannelRow>(
        `SELECT channel_id
        FROM channels;`,
      )
      return result.rows.map((row) => row.channel_id)
    } catch (error) {
      console.error("Error getting registered channels:", error)
      return []
    }
  }
}
