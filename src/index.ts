import { setupComlinkClient } from "./comlink-service"
import { setupPostgresClients } from "./db/postgres-client"
import { DiscordBotClient } from "./discord-bot-client"

setupPostgresClients()
setupComlinkClient()

const client = new DiscordBotClient()
client.on("ready", () => {
  console.log(`Logged in as ${client.user?.tag}!`)
})

client
  .login(process.env.DISCORD_TOKEN)
  .then(() => {
    console.log("Bot started successfully.")
  })
  .catch((error) => {
    console.error("Error logging in:", error)
  })

console.log("Bot initialization complete, ", process.env.DISCORD_APPLICATION_ID)
