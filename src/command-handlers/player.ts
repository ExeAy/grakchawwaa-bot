import { getPlayerData, removePlayerData, storePlayerData } from "../db/kv"
import { Environment } from "../model/environment"
import { JsonResponse } from "../model/json-response"
import { DiscordUser, Player } from "../model/player"
import { writeRespondMessage } from "../util/discord"

export const registerPlayer = async (
  player: Player,
  env: Environment,
): Promise<JsonResponse> => {
  player.allyCode = player.allyCode!.replace(/-/g, "")

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
}

export const unRegisterPlayer = async (
  discordId: string,
  env: Environment,
): Promise<JsonResponse> => {
  const result = await removePlayerData(env, discordId)
  if (!result) {
    return writeRespondMessage("Failed to remove player")
  }
  return writeRespondMessage("Successfully removed player!")
}

export const getPlayerInformation = async (
  user: DiscordUser,
  env: Environment,
): Promise<JsonResponse> => {
  const playerDataJson = await getPlayerData(env, user.id)
  console.log("playerDataJson", playerDataJson)
  const playerData: Player | null = playerDataJson
    ? JSON.parse(playerDataJson)
    : null

  if (playerData)
    return writeRespondMessage(
      `Ally code for ${user?.global_name ?? user?.username}: ${playerData?.allyCode}`,
    )

  return writeRespondMessage("Player is not registered!")
}
