import { initializeMikroORM } from "./db/mikro-orm"
import { setupPostgresClients } from "./db/postgres-client"
import { DiscordBotClient } from "./discord-bot-client"
import { AnniversaryMonitorService } from "./services/anniversary-monitor"
import { setupComlinkClient } from "./services/comlink/comlink-service"
import { setupServices } from "./services/setup-services"
import { TicketMonitorService } from "./services/ticket-monitor"
import { ViolationSummaryService } from "./services/violation-summary"

async function main() {
  await initializeMikroORM()
  setupPostgresClients()
  setupServices()
  setupComlinkClient()

  const client = new DiscordBotClient()
  const summaryService = new ViolationSummaryService(client)
  client.on("clientReady", () => {
    console.log(`Logged in as ${client.user?.tag}!`)

    // Start the ticket monitoring service
    const ticketMonitor = new TicketMonitorService(client, summaryService)
    ticketMonitor.start()

    // Start the anniversary monitoring service
    const anniversaryMonitor = new AnniversaryMonitorService(client)
    anniversaryMonitor.start()
  })

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) {
      return
    }

    await summaryService.handleFullListButton(interaction)
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
}

main().catch((error) => {
  console.error("Failed to start bot:", error)
  process.exit(1)
})
