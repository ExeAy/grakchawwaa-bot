import { Command } from "@sapphire/framework"
import { Player } from "@grakchawwaa/core"

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
    return repository.addUser(discordUserId, allyCode, altAllyCodes)
  }

  public async removeAllyCode(
    discordUserId: string,
    allyCode: string,
  ): Promise<boolean> {
    const repository = this.container.playerRepository
    return repository.removeAllyCode(discordUserId, allyCode)
  }

  public async removePlayer(discordUserId: string): Promise<boolean> {
    const repository = this.container.playerRepository
    return repository.removePlayer(discordUserId)
  }
}
