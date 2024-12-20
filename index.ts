import { Client, Events, GatewayIntentBits } from "discord.js"
import { config } from "dotenv"

const client = new Client({ intents: GatewayIntentBits.Guilds })
config()

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`)
})

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN)
