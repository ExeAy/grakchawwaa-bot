import { SapphireClient } from "@sapphire/framework"
import { GatewayIntentBits } from "discord.js"
import { setupRedisClient } from "./db/redis-client"

setupRedisClient()

const client = new SapphireClient({
  intents: [
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
})

client.login(process.env.DISCORD_TOKEN)

console.log("Bot started, ", process.env.DISCORD_APPLICATION_ID)
