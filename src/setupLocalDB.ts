import { Client } from "pg"
import { setupPostgresClients } from "./db/postgres-client"

const initializeDatabase = async (): Promise<void> => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS players (
      discord_id text NOT NULL PRIMARY KEY,
      ally_code char(9) NOT NULL,
      alt_ally_codes char(9)[]
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
    await client.query(createTableQuery)
    console.log("Tables created successfully.")
  } catch (error) {
    console.error("Error creating tables:", error)
  } finally {
    await client.end()
  }
}

;(async () => {
  try {
    setupPostgresClients()
    await initializeDatabase()
    console.log("Database initialization complete.")
  } catch (error) {
    console.error("Error during database initialization:", error)
  }
})()
