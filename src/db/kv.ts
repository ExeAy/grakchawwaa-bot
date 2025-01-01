import { Environment } from "../model/environment"

export interface KeyValuePair {
  key: string
  value: string
}

export const storePlayerData = async (
  env: Environment,
  keyValue: KeyValuePair,
): Promise<boolean> => {
  try {
    await env.PLAYERS_BINDING.put(keyValue.key, keyValue.value)
    const value = await env.PLAYERS_BINDING.get(keyValue.key)
    if (value === null) {
      return false
    }
    return true
  } catch (err) {
    // In a production application, you could instead choose to retry your KV
    // read or fall back to a default code path.
    console.error(`KV returned error: ${err}`)
    return false
  }
}
