import { container } from "@sapphire/pieces"
import { MhanndalorianClient } from "./mhanndalorian-client"
import { CachedMhanndalorianClient } from "./cached-mhanndalorian-client"

// Extend the Sapphire container to include the Mhanndalorian clients
declare module "@sapphire/pieces" {
  interface Container {
    mhanndalorianClient: MhanndalorianClient
    cachedMhanndalorianClient: CachedMhanndalorianClient
  }
}

export const setupMhanndalorianClient = (): void => {
  const apiKey = process.env.MHANNDALORIAN_API_KEY
  const discordId = process.env.MHANNDALORIAN_DISCORD_ID
  const allyCode = process.env.MHANNDALORIAN_ALLY_CODE

  if (!apiKey || !discordId || !allyCode) {
    console.warn(
      "Mhanndalorian API credentials not configured. Set MHANNDALORIAN_API_KEY, MHANNDALORIAN_DISCORD_ID, and MHANNDALORIAN_ALLY_CODE environment variables.",
    )
    return
  }

  const mhanndalorianClient = new MhanndalorianClient({
    apiKey,
    discordId,
    allyCode,
  })

  const cachedMhanndalorianClient = CachedMhanndalorianClient.getInstance(
    mhanndalorianClient,
  )

  container.mhanndalorianClient = mhanndalorianClient
  container.cachedMhanndalorianClient = cachedMhanndalorianClient
}
