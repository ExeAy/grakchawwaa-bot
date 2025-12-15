import { Client } from "pg"
import {
  initializeDatabase,
  insertTestData,
  type DatabaseConfig,
} from "./db-utils"

const MAX_RETRIES = 30
const RETRY_DELAY = 1000

const DOCKER_DB_CONFIG: DatabaseConfig = {
  user: "grakchawwaa",
  host: process.env.PGHOST || "postgres",
  password: "dev_password",
  database: "grakchawwaa_dev",
  port: 5432,
}

const waitForDatabase = async (config: DatabaseConfig): Promise<void> => {
  for (let i = 0; i < MAX_RETRIES; i++) {
    const client = new Client(config)
    try {
      await client.connect()
      await client.query("SELECT 1")
      await client.end()
      console.log("Database is ready!")
      return
    } catch (error) {
      try {
        await client.end()
      } catch {
        // Ignore
      }
      if (i === MAX_RETRIES - 1) {
        throw new Error(
          `Database not ready after ${MAX_RETRIES} attempts: ${error}`,
        )
      }
      console.log(
        `Waiting for database... (${i + 1}/${MAX_RETRIES})`,
      )
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))
    }
  }
}

;(async () => {
  try {
    console.log("Waiting for PostgreSQL to be ready...")
    await waitForDatabase(DOCKER_DB_CONFIG)

    console.log("Setting up database tables...")
    await initializeDatabase(DOCKER_DB_CONFIG)

    console.log("Inserting test data...")
    await insertTestData(DOCKER_DB_CONFIG)

    console.log("Docker database setup complete!")
  } catch (error) {
    console.error("Error during Docker database setup:", error)
    process.exitCode = 1
  }
})()

