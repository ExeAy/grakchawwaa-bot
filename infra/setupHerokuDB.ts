import { Client } from "pg"
import { setupPostgresClients } from "../src/db/postgres-client"

const initializeHerokuDatabase = async (): Promise<void> => {
  const createTablesQuery = `
    CREATE TABLE IF NOT EXISTS players (
      discord_id text NOT NULL PRIMARY KEY,
      ally_code char(9) NOT NULL,
      alt_ally_codes char(9)[]
    );

    DROP TABLE IF EXISTS channels;

    CREATE TABLE IF NOT EXISTS ticketViolations (
      guild_id text NOT NULL,
      date timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      players text[] NOT NULL,
      PRIMARY KEY (guild_id, date)
    );
  `

  const client = new Client({
    connectionString: process.env.PG_DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  try {
    await client.connect()
    await client.query(createTablesQuery)
    console.log("Heroku database tables created successfully.")
  } catch (error) {
    console.error("Error creating Heroku database tables:", error)
  } finally {
    await client.end()
  }
}

;(async () => {
  try {
    setupPostgresClients()
    await initializeHerokuDatabase()
    console.log("Heroku database initialization complete.")
  } catch (error) {
    console.error("Error during Heroku database initialization:", error)
  }
})()
