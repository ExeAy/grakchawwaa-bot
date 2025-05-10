import { Client } from "pg"
import { setupPostgresClients } from "../src/db/postgres-client"

const initializeDatabase = async (): Promise<void> => {
  const createTablesQuery = `

    CREATE TABLE IF NOT EXISTS players (
      discord_id text NOT NULL PRIMARY KEY,
      ally_code char(9) NOT NULL,
      alt_ally_codes char(9)[]
    );
    
    DROP TABLE IF EXISTS ticketViolations;
    DROP TABLE IF EXISTS ticketCollectionChannels;

    CREATE TABLE IF NOT EXISTS ticketViolations (
      guild_id text NOT NULL,
      date timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      players text[] NOT NULL,
      PRIMARY KEY (guild_id, date)
    );

    CREATE TABLE IF NOT EXISTS ticketCollectionChannels (
      guild_id text NOT NULL PRIMARY KEY,
      channel_id text NOT NULL,
      next_refresh_time text NOT NULL
    );
  `

  const client = new Client({
    user: "hfal0t",
    host: "localhost",
    database: "grakchawaa",
    port: 5432,
  })

  try {
    await client.connect()
    await client.query(createTablesQuery)
    console.log("Local database tables created successfully.")
  } catch (error) {
    console.error("Error creating local database tables:", error)
  } finally {
    await client.end()
  }
}

;(async () => {
  try {
    setupPostgresClients()
    await initializeDatabase()
    console.log("Local database initialization complete.")
  } catch (error) {
    console.error("Error during local database initialization:", error)
  }
})()
