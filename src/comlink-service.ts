import { container } from "@sapphire/pieces"
import ComlinkStub from "@swgoh-utils/comlink"

// Extend the Sapphire container to include the comlink client
declare module "@sapphire/pieces" {
  interface Container {
    comlinkClient: InstanceType<typeof ComlinkStub>
  }
}

export const setupComlinkClient = (): void => {
  const comlinkUrl = process.env.COMLINK_URL || "http://localhost:3000"
  const accessKey = process.env.COMLINK_ACCESS_KEY || ""
  const secretKey = process.env.COMLINK_SECRET_KEY || ""

  const comlinkClient = new ComlinkStub({
    url: comlinkUrl,
    accessKey,
    secretKey,
  })

  container.comlinkClient = comlinkClient
}
