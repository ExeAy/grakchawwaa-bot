import { Client } from "pg"
import { setupPostgresClients } from "../src/db/postgres-client"

const REQUIRED_ENV_VARS = [
  "PGUSER",
  "PGHOST",
  "PGPASSWORD",
  "PGDATABASE",
] as const

const ensureDatabaseEnv = (): void => {
  const missingEnv = REQUIRED_ENV_VARS.filter(
    (variable) => !process.env[variable],
  )

  if (missingEnv.length > 0) {
    throw new Error(
      `Missing environment variables: ${missingEnv.join(", ")}`,
    )
  }
}

const initializeDatabase = async (): Promise<void> => {
  const createTablesQuery = `

    CREATE TABLE IF NOT EXISTS players (
      discord_id text NOT NULL PRIMARY KEY,
      ally_code char(9) NOT NULL,
      alt_ally_codes char(9)[]
    );

    CREATE TABLE IF NOT EXISTS ticketViolations (
      guild_id text NOT NULL,
      date timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ticket_counts jsonb NOT NULL,
      PRIMARY KEY (guild_id, date)
    );

    CREATE TABLE IF NOT EXISTS guildMessageChannels (
      guild_id text NOT NULL PRIMARY KEY,
      ticket_collection_channel_id text,
      next_ticket_collection_refresh_time text,
      ticket_reminder_channel_id text,
      anniversary_channel_id text
    );

    ALTER TABLE IF EXISTS guildMessageChannels
      ADD COLUMN IF NOT EXISTS ticket_reminder_channel_id text;
  `

  const client = new Client({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    port: parseInt(process.env.PGPORT || "5432", 10),
  })

  try {
    await client.connect()
    await client.query(createTablesQuery)
    console.log("Local database tables created successfully.")
  } catch (error) {
    console.error("Error creating local database tables:", error)
    throw error
  } finally {
    await client.end()
  }
}

;(async () => {
  try {
    ensureDatabaseEnv()
    setupPostgresClients()
    await initializeDatabase()
    console.log("Local database initialization complete.")
  } catch (error) {
    console.error(
      "Error during local database initialization:",
      error,
    )
    process.exitCode = 1
  }
})()
