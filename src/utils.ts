import "dotenv/config"

export async function DiscordRequest(
  endpoint: string,
  options: RequestInit | undefined,
) {
  // append endpoint to root API URL
  const url = "https://discord.com/api/v10/" + endpoint
  // Stringify payloads
  if (options?.body) options.body = JSON.stringify(options.body)
  // Use fetch to make requests
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      "Content-Type": "application/json; charset=UTF-8",
      "User-Agent":
        "DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)",
    },
    ...options,
  })
  // throw API errors
  if (!res.ok) {
    const data = await res.json()
    throw new Error(JSON.stringify(data))
  }
  // return original response
  return res
}

export async function InstallGlobalCommands(
  appId: string | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commands: any,
) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, { method: "PUT", body: commands })
  } catch (err) {
    console.error(err)
  }
}

// Simple method that returns a random emoji from list
export function getRandomEmoji() {
  const emojiList = [
    "😭",
    "😄",
    "😌",
    "🤓",
    "😎",
    "😤",
    "🤖",
    "😶‍🌫️",
    "🌏",
    "📸",
    "💿",
    "👋",
    "🌊",
    "✨",
  ]
  return emojiList[Math.floor(Math.random() * emojiList.length)]
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
