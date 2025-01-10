import { DiscordPlayer, Player } from "../model/player"
import { getRedisClient } from "./redis-client"

export const getPlayer = async (userId: string): Promise<Player | null> => {
  const client = getRedisClient()
  try {
    await client.connect()

    const playerDataJson = await client.get(userId)
    if (!playerDataJson) {
      return null
    }
    return JSON.parse(playerDataJson)
  } catch (error) {
    console.error(error)
    return null
  } finally {
    await client.disconnect()
  }
}

export const addUser = async (player: DiscordPlayer): Promise<boolean> => {
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

export const removeAllyCode = async (
  player: DiscordPlayer,
): Promise<boolean> => {
  const client = getRedisClient()
  try {
    await client.connect()

    const playerDataJson = await client.get(player.discordUser.id)
    if (!playerDataJson) {
      return false
    }
    const playerData: Player = JSON.parse(playerDataJson)
    const newPlayer = { ...playerData }

    console.log("Player", player)
    console.log("PlayerData", playerData)
    if (player.allyCode === playerData.allyCode) {
      newPlayer.allyCode = ""
    }

    if (!playerData.altAllyCodes.includes(player.allyCode)) {
      newPlayer.altAllyCodes = newPlayer.altAllyCodes.filter(
        (altAllyCode) => altAllyCode !== player.allyCode,
      )
    }

    console.log("Updating player", newPlayer)
    await client.set(player.discordUser.id, JSON.stringify(newPlayer))
    await client.discard
    return true
  } catch (error) {
    console.error(error)
    return false
  } finally {
    await client.disconnect()
  }
}

export const removePlayer = async (player: DiscordPlayer): Promise<boolean> => {
  const client = getRedisClient()
  try {
    await client.connect()

    await client.del(player.discordUser.id)
    return true
  } catch (error) {
    console.error(error)
    return false
  } finally {
    await client.disconnect()
  }
}
