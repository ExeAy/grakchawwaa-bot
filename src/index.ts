import { SapphireClient } from "@sapphire/framework"
import { Events, GatewayIntentBits } from "discord.js"
import { setupRedisClient } from "./db/redis-client"

setupRedisClient()

const client = new SapphireClient({
  intents: [
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
})

client.on(Events.InteractionCreate, (interaction) => {
  console.log(interaction)
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
