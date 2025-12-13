import { container } from "@sapphire/pieces"
import { CachedComlinkClient } from "./comlink/cached-comlink-client"
import { setupMhanndalorianClient } from "./mhanndalorian/mhanndalorian-service"

declare module "@sapphire/pieces" {
  interface Container {
    cachedComlinkClient: CachedComlinkClient
  }
}

export const setupServices = (): void => {
  const cachedComlinkClient = CachedComlinkClient.getInstance()
  container.cachedComlinkClient = cachedComlinkClient

  setupMhanndalorianClient()
}
