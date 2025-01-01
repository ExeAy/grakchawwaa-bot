import { storePlayerData } from "../db/kv"
import { Environment } from "../model/environment"
import { JsonResponse } from "../model/json-response"
import { Player } from "../model/player"
import { writeRespondMessage } from "../util/discord"

export const registerPlayer = async (
  player: Player,
  env: Environment,
): Promise<JsonResponse> => {
  try {
    console.log("dc user", player.discordUser)
    const result = await storePlayerData(env, {
      key: player.discordUser.id,
      value: JSON.stringify(player),
    })
    if (!result) {
      return writeRespondMessage(
        `Failed to register player with ally code: ${player.allyCode}.`,
      )
    }
    return writeRespondMessage(
      `Successfully registered player with ally code: ${player.allyCode}`,
    )
  } catch (error) {
    console.error(`KV returned error: ${error}`)
    return writeRespondMessage(
      `An error occurred while registering player with ally code: ${player.allyCode}.`,
    )
  }
}
