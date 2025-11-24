import { Pool, QueryResult, QueryResultRow } from "pg"
import { DiscordPlayer, Player } from "../model/player"
import { normalizeAllyCode } from "../utils/ally-code"

interface PlayerRow extends QueryResultRow {
  discord_id: string
  ally_code: string
  alt_ally_codes: string[]
  registered_at: Date | string
}

const QUERIES = {
  ADD_USER: `
    INSERT INTO players (discord_id, ally_code, alt_ally_codes, registered_at)
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    ON CONFLICT (discord_id) DO UPDATE 
    SET ally_code = $2, alt_ally_codes = $3;
  `,
  GET_PLAYER: `
    SELECT discord_id, ally_code, alt_ally_codes, registered_at
    FROM players
    WHERE discord_id = $1;
  `,
  REMOVE_PLAYER: `
    DELETE FROM players
    WHERE discord_id = $1;
  `,
  FIND_DISCORD_BY_ALLY_CODE: `
    SELECT discord_id
    FROM players
    WHERE ally_code = $1 OR $1 = ANY(alt_ally_codes);
  `,
} as const

export class PlayerPGClient {
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

  public async addUser(player: DiscordPlayer): Promise<boolean> {
    if (!player?.discordUser?.id || !player?.allyCode) {
      console.error("Invalid player data")
      return false
    }
    console.log("Adding user", player.discordUser.id, player.allyCode)
    try {
      await this.query(QUERIES.ADD_USER, [
        player.discordUser.id,
        player.allyCode,
        player.altAllyCodes ?? [],
      ])
      return true
    } catch (error) {
      console.error("Error adding user:", error)
      return false
    }
  }

  public async getPlayer(userId: string): Promise<Player | null> {
    if (!userId) {
      console.error("Invalid user ID")
      return null
    }

    try {
      const result = await this.query<PlayerRow>(QUERIES.GET_PLAYER, [userId])

      if (result.rows.length === 0) {
        return null
      }

      const player = result.rows[0]
      if (!player) return null

      return {
        allyCode: player.ally_code,
        altAllyCodes: player.alt_ally_codes ?? [],
      }
    } catch (error) {
      console.error("Error getting player:", error)
      return null
    }
  }

  public async removeAllyCode(player: DiscordPlayer): Promise<boolean> {
    if (!player?.discordUser?.id || !player?.allyCode) {
      console.error("Invalid player data")
      return false
    }

    try {
      const result = await this.query<PlayerRow>(QUERIES.GET_PLAYER, [
        player.discordUser.id,
      ])

      if (result.rows.length === 0) {
        return false
      }

      const playerData = result.rows[0]
      if (!playerData) return false

      const newPlayer = { ...playerData }

      if (player.allyCode === playerData.ally_code) {
        newPlayer.ally_code = ""
      }

      if (playerData.alt_ally_codes?.includes(player.allyCode)) {
        newPlayer.alt_ally_codes = (newPlayer.alt_ally_codes ?? []).filter(
          (altAllyCode) => altAllyCode !== player.allyCode,
        )
      }

      await this.query(QUERIES.ADD_USER, [
        player.discordUser.id,
        newPlayer.ally_code,
        newPlayer.alt_ally_codes ?? [],
      ])
      return true
    } catch (error) {
      console.error("Error removing ally code:", error)
      return false
    }
  }

  public async removePlayer(player: DiscordPlayer): Promise<boolean> {
    if (!player?.discordUser?.id) {
      console.error("Invalid player data")
      return false
    }

    try {
      await this.query(QUERIES.REMOVE_PLAYER, [player.discordUser.id])
      return true
    } catch (error) {
      console.error("Error removing player:", error)
      return false
    }
  }

  public async findDiscordIdByAllyCode(
    allyCode: string,
  ): Promise<string | null> {
    const normalized = normalizeAllyCode(allyCode)
    if (!normalized) {
      return null
    }

    try {
      const result = await this.query<{ discord_id: string }>(
        QUERIES.FIND_DISCORD_BY_ALLY_CODE,
        [normalized],
      )
      return result.rows[0]?.discord_id ?? null
    } catch (error) {
      console.error("Error finding discord id by ally code:", error)
      return null
    }
  }
}
