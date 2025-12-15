import { SapphireClient } from "@sapphire/framework"
import { getRootData } from "@sapphire/pieces"
import { GatewayIntentBits } from "discord.js"
import path from "node:path"

export class DiscordBotClient extends SapphireClient {
  private rootData = getRootData()

  public constructor() {
    super({
      intents: [
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
      ],
      baseUserDirectory: __dirname,
    })

    this.stores
      .get("interaction-handlers")
      .registerPath(path.join(this.rootData.root, "interactions"))
  }
}
