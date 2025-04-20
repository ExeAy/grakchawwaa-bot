import { Command } from "@sapphire/framework"
import { DiscordPlayer, Player } from "../../model/player"

export class PlayerOperationsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "player-operations",
      description: "Player management operations",
    })
  }

  public async getPlayer(userId: string): Promise<Player | null> {
    const client = this.container.playerClient
    return client.getPlayer(userId)
  }

  public async addUser(player: DiscordPlayer): Promise<boolean> {
    const client = this.container.playerClient
    return client.addUser(player)
  }

  public async removeAllyCode(player: DiscordPlayer): Promise<boolean> {
    const client = this.container.playerClient
    return client.removeAllyCode(player)
  }

  public async removePlayer(player: DiscordPlayer): Promise<boolean> {
    const client = this.container.playerClient
    return client.removePlayer(player)
  }
}
