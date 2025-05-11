import { container } from "@sapphire/pieces"
import { CachedComlinkClient } from "./cached-comlink-client"

declare module "@sapphire/pieces" {
  interface Container {
    cachedComlinkClient: CachedComlinkClient
  }
}

export const setupServices = (): void => {
  const cachedComlinkClient = CachedComlinkClient.getInstance()
  container.cachedComlinkClient = cachedComlinkClient
}
