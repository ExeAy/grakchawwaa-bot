import { Client } from "pg"
import { CREATE_TABLES_QUERY } from "./db-schema"

export interface DatabaseConfig {
  user: string
  host: string
  password: string
  database: string
  port: number
}

export const createClient = (config: DatabaseConfig): Client => {
  return new Client({
    user: config.user,
    host: config.host,
    password: config.password,
    database: config.database,
    port: config.port,
  })
}

export const initializeDatabase = async (
  config: DatabaseConfig,
): Promise<void> => {
  const client = createClient(config)

  try {
    await client.connect()
    await client.query(CREATE_TABLES_QUERY)
    console.log("Database tables created successfully.")
  } catch (error) {
    console.error("Error creating database tables:", error)
    throw error
  } finally {
    await client.end()
  }
}

export interface TicketViolation {
  guild_id: string
  date: string
  ticket_counts: Record<string, number>
}

export const insertTestData = async (
  config: DatabaseConfig,
): Promise<void> => {
  const client = createClient(config)

  const guildId = "oAhUncGySeGpKznycCMgYQ"
  const playerIds = [
    "9i5caIFsRY26XTvKrlzixg",
    "uINBkfvgQoSt_LOjqgtFRw",
    "tu5Ez13lSQ6I6iUNKKYEbA",
    "ZqqN6ov5QWynuJynCMn8KQ",
    "4L_tpaapT0q1Fvxi3JzyAQ",
    "0Y2XQa7FrR-6uCY2kUNiWw",
    "4fpk3Jv2S4-yVX0nBlNDYQ",
    "m3A-tUP2S6abP1O8YkHtnA",
    "RE7NTh3cRbC7W1z2efbJiw",
    "3sB5E2DTQ5G8VeK2Pgu0SA",
    "xRz9g0I5S2Dk3Lf8PcnjYw",
    "PvQ7NWf1S1aWQ0p3U6Ztia",
    "ILBBWTD1TyuCoEte-LMkmQ",
    "OmcaGcVvRFSMDMGPA9usdg",
  ]

  const testData: TicketViolation[] = []
  const now = new Date()

  for (let i = 0; i < 7; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    const ticketCounts = playerIds.reduce<Record<string, number>>(
      (acc, playerId) => {
        acc[playerId] = Math.floor(Math.random() * 600)
        return acc
      },
      {},
    )

    testData.push({
      guild_id: guildId,
      date: date.toISOString(),
      ticket_counts: ticketCounts,
    })
  }

  try {
    await client.connect()

    for (const data of testData) {
      const query = `
        INSERT INTO ticketViolations (guild_id, date, ticket_counts)
        VALUES ($1, $2, $3)
        ON CONFLICT (guild_id, date) DO UPDATE 
        SET ticket_counts = $3
      `
      await client.query(query, [
        data.guild_id,
        data.date,
        JSON.stringify(data.ticket_counts),
      ])
    }

    console.log(
      `Successfully inserted ${testData.length} test records into ticketViolations table.`,
    )
  } catch (error) {
    console.error("Error inserting test data:", error)
    throw error
  } finally {
    await client.end()
  }
}

