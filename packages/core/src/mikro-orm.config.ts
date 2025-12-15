import { defineConfig } from "@mikro-orm/postgresql"
import { GuildMessageChannels } from "./entities/GuildMessageChannels.entity"
import { Player } from "./entities/Player.entity"
import { TicketViolation } from "./entities/TicketViolation.entity"

const isProduction = process.env.NODE_ENV === "production"

export default defineConfig({
  entities: [Player, GuildMessageChannels, TicketViolation],
  ...(isProduction && process.env.PG_DATABASE_URL
    ? {
        clientUrl: process.env.PG_DATABASE_URL,
        driverOptions: {
          connection: {
            ssl: { rejectUnauthorized: false },
          },
        },
      }
    : {
        dbName: process.env.PGDATABASE || "grakchawwaa_dev",
        user: process.env.PGUSER || "grakchawwaa",
        password: process.env.PGPASSWORD || "dev_password",
        host: process.env.PGHOST || "localhost",
        port: parseInt(process.env.PGPORT || "5432", 10),
      }),
  migrations: {
    path: "./src/migrations",
    pathTs: "./src/migrations",
  },
})
