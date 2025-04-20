import { container } from "@sapphire/pieces"
import { setupPostgresClients } from "./db/postgres-client"
import { DiscordBotClient } from "./discord-bot-client"

setupPostgresClients()

const client = new DiscordBotClient()
client.on("ready", () => {
  console.log(`Logged in as ${client.user?.tag}!`)
})

client.on("messageCreate", async (message) => {
  if (message.author.bot) return

  const channelClient = container.channelClient
  const isRegistered = await channelClient.isChannelRegistered(
    message.channelId,
  )

  if (isRegistered) {
    console.log(
      `Message from ${message.author.tag} in ${message.channelId}: ${message.content}`,
    )
  }
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
