import { Player } from "../model/player"
import { getRedisClient } from "./redis-client"

export const addUser = async (player: Player): Promise<boolean> => {
  const client = getRedisClient()
  try {
    await client.connect()

    await client.set(
      player.discordUser.id,
      JSON.stringify({
        allyCode: player.allyCode,
        altAllyCodes: player.altAllyCodes,
      }),
    )
    return true
  } catch (error) {
    console.error(error)
    return false
  } finally {
    await client.disconnect()
  }
}
