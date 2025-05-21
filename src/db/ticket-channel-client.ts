import { Pool, QueryResult, QueryResultRow } from "pg"

interface TicketChannelRow extends QueryResultRow {
  guild_id: string
  ticket_collection_channel_id: string
  next_ticket_collection_refresh_time: string
  anniversary_channel_id: string
}

const QUERIES = {
  REGISTER_TICKET_COLLECTION_CHANNEL: `
    INSERT INTO guildMessageChannels (guild_id, ticket_collection_channel_id, next_ticket_collection_refresh_time)
    VALUES ($1, $2, $3)
    ON CONFLICT (guild_id) DO UPDATE 
    SET ticket_collection_channel_id = $2, next_ticket_collection_refresh_time = $3;
  `,
  REGISTER_ANNIVERSARY_CHANNEL: `
    INSERT INTO guildMessageChannels (guild_id, anniversary_channel_id)
    VALUES ($1, $2)
    ON CONFLICT (guild_id) DO UPDATE 
    SET anniversary_channel_id = $2;
  `,
  UNREGISTER_ANNIVERSARY_CHANNEL: `
    UPDATE guildMessageChannels
    SET anniversary_channel_id = NULL
    WHERE guild_id = $1;
  `,
  GET_GUILD_MESSAGE_CHANNELS: `
    SELECT guild_id, ticket_collection_channel_id, next_ticket_collection_refresh_time, anniversary_channel_id
    FROM guildMessageChannels
    WHERE guild_id = $1;
  `,
  GET_ALL_GUILDS: `
    SELECT guild_id, ticket_collection_channel_id, next_ticket_collection_refresh_time, anniversary_channel_id
    FROM guildMessageChannels;
  `,
  UNREGISTER_CHANNEL: `
    DELETE FROM guildMessageChannels
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

  public async registerTicketCollectionChannel(
    guildId: string,
    channelId: string,
    nextRefreshTime: string,
  ): Promise<boolean> {
    if (!guildId || !channelId || !nextRefreshTime) {
      console.error("Invalid guild, channel ID, or refresh time")
      return false
    }

    try {
      await this.query(QUERIES.REGISTER_TICKET_COLLECTION_CHANNEL, [
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

  public async registerAnniversaryChannel(
    guildId: string,
    channelId: string,
  ): Promise<boolean> {
    if (!guildId || !channelId) {
      console.error("Invalid guild or channel ID")
      return false
    }

    try {
      await this.query(QUERIES.REGISTER_ANNIVERSARY_CHANNEL, [
        guildId,
        channelId,
      ])
      return true
    } catch (error) {
      console.error("Error registering anniversary channel:", error)
      return false
    }
  }

  public async unregisterAnniversaryChannel(guildId: string): Promise<boolean> {
    if (!guildId) {
      console.error("Invalid guild ID")
      return false
    }

    try {
      await this.query(QUERIES.UNREGISTER_ANNIVERSARY_CHANNEL, [guildId])
      return true
    } catch (error) {
      console.error("Error unregistering anniversary channel:", error)
      return false
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

  public async getGuildMessageChannels(
    guildId: string,
  ): Promise<TicketChannelRow | null> {
    if (!guildId) {
      console.error("Invalid guild ID")
      return null
    }

    try {
      const result = await this.query<TicketChannelRow>(
        QUERIES.GET_GUILD_MESSAGE_CHANNELS,
        [guildId],
      )
      return result.rows[0] || null
    } catch (error) {
      console.error("Error getting guild message channels:", error)
      return null
    }
  }

  public async unregisterTicketCollectionChannel(
    guildId: string,
  ): Promise<boolean> {
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
