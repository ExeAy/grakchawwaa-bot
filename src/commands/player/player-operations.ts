import { Command } from "@sapphire/framework"
import { Player } from "../../entities/Player.entity"

export class PlayerOperationsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "player-operations",
      description: "Player management operations",
    })
  }

  public async getPlayer(userId: string): Promise<Player | null> {
    const repository = this.container.playerRepository
    return repository.getPlayer(userId)
  }

  public async addUser(
    discordUserId: string,
    allyCode: string,
    altAllyCodes?: string[],
  ): Promise<boolean> {
    const repository = this.container.playerRepository
    const user = await this.container.client.users.fetch(discordUserId)
    return repository.addUser(user, allyCode, altAllyCodes)
  }

  public async removeAllyCode(
    discordUserId: string,
    allyCode: string,
  ): Promise<boolean> {
    const repository = this.container.playerRepository
    const user = await this.container.client.users.fetch(discordUserId)
    return repository.removeAllyCode(user, allyCode)
  }

  public async removePlayer(discordUserId: string): Promise<boolean> {
    const repository = this.container.playerRepository
    const user = await this.container.client.users.fetch(discordUserId)
    return repository.removePlayer(user)
  }
}
