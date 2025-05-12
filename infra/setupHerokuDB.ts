import { Client } from "pg"
import { setupPostgresClients } from "../src/db/postgres-client"

const initializeHerokuDatabase = async (): Promise<void> => {
  const createTablesQuery = `
    CREATE TABLE IF NOT EXISTS players (
      discord_id text NOT NULL PRIMARY KEY,
      ally_code char(9) NOT NULL,
      alt_ally_codes char(9)[]
    );

    DROP TABLE IF EXISTS ticketCollectionChannels;

    CREATE TABLE IF NOT EXISTS ticketViolations (
      guild_id text NOT NULL,
      date timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ticket_counts jsonb NOT NULL,
      PRIMARY KEY (guild_id, date)
    );

    CREATE TABLE IF NOT EXISTS ticketCollectionChannels (
      guild_id text NOT NULL PRIMARY KEY,
      channel_id text NOT NULL,
      next_refresh_time text NOT NULL
    );

    -- Create a function to delete old records
    CREATE OR REPLACE FUNCTION delete_old_ticket_violations() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      DELETE FROM ticketViolations
      WHERE date < NOW() - INTERVAL '3 months';
      RETURN NULL;
    END;
    $$;

    -- Create or replace the trigger
    DROP TRIGGER IF EXISTS cleanup_old_violations ON ticketViolations;
    
    CREATE TRIGGER cleanup_old_violations
      AFTER INSERT ON ticketViolations
      EXECUTE PROCEDURE delete_old_ticket_violations();

    -- Initial cleanup of old records
    DELETE FROM ticketViolations
    WHERE date < NOW() - INTERVAL '3 months';
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
