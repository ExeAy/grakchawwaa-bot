import { readFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import {
  Client,
  GatewayIntentBits,
  GuildMember,
  User,
} from "discord.js"
import { normalizeAllyCode, sanitizeAllyCodeList } from "../src/utils/ally-code"
import { PlayerPGClient } from "../src/db/player-client"

interface PlayerRegistrationInput {
  playerName: string
  allyCode: string
  discordHandle: string
}

interface PlayerRegistration extends PlayerRegistrationInput {
  discordId: string
}

type RegistrationOutcome =
  | "created"
  | "alt-added"
  | "skipped-primary"
  | "skipped-alt"
  | "failed"

const REQUIRED_ENV_VARS = [
  "PGUSER",
  "PGHOST",
  "PGPASSWORD",
  "PGDATABASE",
] as const

const REQUIRED_DISCORD_ENV_VARS = [
  "DISCORD_TOKEN",
  "DISCORD_GUILD_ID",
] as const

const ensureDatabaseEnv = (): void => {
  const missingEnv = REQUIRED_ENV_VARS.filter(
    (variable) => !process.env[variable],
  )

  if (missingEnv.length > 0) {
    throw new Error(
      `Missing environment variables: ${missingEnv.join(", ")}`,
    )
  }
}

const ensureDiscordEnv = (): void => {
  const missingEnv = REQUIRED_DISCORD_ENV_VARS.filter(
    (variable) => !process.env[variable],
  )

  if (missingEnv.length > 0) {
    throw new Error(
      `Missing Discord environment variables: ${missingEnv.join(", ")}`,
    )
  }
}
const getFilePath = (): string => {
  const flagIndex = process.argv.findIndex((arg) => arg === "--file")
  if (flagIndex >= 0 && process.argv[flagIndex + 1]) {
    const providedPath = process.argv[flagIndex + 1]
    if (!providedPath) {
      throw new Error("The --file flag requires a file path.")
    }
    return path.resolve(providedPath)
  }

  return path.resolve(process.cwd(), "registered_players.txt")
}
const normalizeHandle = (handle: string | undefined): string => {
  if (!handle) {
    return ""
  }

  const [name] = handle.trim().toLowerCase().split("#")
  return name ?? ""
}

const parseLine = (
  line: string,
  index: number,
): PlayerRegistrationInput | null => {
  const trimmed = line.trim()
  if (!trimmed) return null

  const colonIndex = trimmed.indexOf(":")
  if (colonIndex === -1) {
    throw new Error(`Line ${index} is missing ":" separator.`)
  }

  const left = trimmed.slice(0, colonIndex).trim()
  const right = trimmed.slice(colonIndex + 1).trim()

  if (!right) {
    throw new Error(`Line ${index} is missing a discord id.`)
  }

  const match = left.match(/(.+)\s+(\d{3}-?\d{3}-?\d{3})$/)
  if (!match) {
    throw new Error(`Line ${index} is missing a valid ally code.`)
  }

  const [, namePart, allyPart] = match

  if (!namePart || !allyPart) {
    throw new Error(`Line ${index} has invalid formatting.`)
  }

  const playerName = namePart.trim()
  const allyCode = normalizeAllyCode(allyPart)

  if (!allyCode) {
    throw new Error(`Line ${index} has an invalid ally code.`)
  }

  return {
    playerName,
    allyCode,
    discordHandle: right,
  }
}

const loadPlayers = async (
  filePath: string,
): Promise<PlayerRegistrationInput[]> => {
  const fileContent = await readFile(filePath, "utf8")
  const lines = fileContent.split(/\r?\n/)

  const players: PlayerRegistrationInput[] = []
  lines.forEach((line, idx) => {
    const parsed = parseLine(line, idx + 1)
    if (parsed) {
      players.push(parsed)
    }
  })

  return players
}

const createDiscordClient = async (): Promise<Client> => {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  })

  await client.login(process.env.DISCORD_TOKEN)
  return client
}

const findMatchingMember = (
  member: GuildMember,
  handle: string,
): boolean => {
  const normalizedHandle = normalizeHandle(handle)
  const username = member.user.username.toLowerCase()

  return normalizedHandle === username
}

const resolveDiscordIds = async (
  players: PlayerRegistrationInput[],
  client: Client,
): Promise<PlayerRegistration[]> => {
  const guildId = process.env.DISCORD_GUILD_ID!
  const guild = await client.guilds.fetch(guildId)
  const members = await guild.members.fetch()

  const resolvedPlayers: PlayerRegistration[] = []
  const unresolvedPlayers: PlayerRegistrationInput[] = []

  players.forEach((player) => {
    const member = members.find((guildMember) =>
      findMatchingMember(guildMember, player.discordHandle),
    )

    if (!member) {
      unresolvedPlayers.push(player)
      return
    }

    resolvedPlayers.push({
      ...player,
      discordId: member.user.id,
    })
  })

  if (unresolvedPlayers.length > 0) {
    const names = unresolvedPlayers
      .map(
        (player) => `${player.playerName} (${player.discordHandle})`,
      )
      .join(", ")

    console.warn(
      [
        `Skipping ${unresolvedPlayers.length} players not found in guild ${guildId}.`,
        "Ensure the bot shares the guild and has the Server Members intent enabled if more matches are expected.",
        `Skipped entries: ${names}`,
      ].join(" "),
    )
  }

  return resolvedPlayers
}

const ensurePlayerRegistration = async (
  player: PlayerRegistration,
  playerClient: PlayerPGClient,
): Promise<RegistrationOutcome> => {
  try {
    const existingPlayer = await playerClient.getPlayer(player.discordId)

    if (!existingPlayer) {
      const created = await playerClient.addUser({
        discordUser: { id: player.discordId } as User,
        allyCode: player.allyCode,
        altAllyCodes: [],
      })
      return created ? "created" : "failed"
    }

    const primaryCode =
      normalizeAllyCode(existingPlayer.allyCode) ?? player.allyCode
    if (primaryCode === player.allyCode) {
      return "skipped-primary"
    }

    const altCodes = sanitizeAllyCodeList(existingPlayer.altAllyCodes)

    if (altCodes.includes(player.allyCode)) {
      return "skipped-alt"
    }

    const updatedAltCodes = [...altCodes, player.allyCode]

    const updated = await playerClient.addUser({
      discordUser: { id: player.discordId } as User,
      allyCode: primaryCode,
      altAllyCodes: updatedAltCodes,
    })

    return updated ? "alt-added" : "failed"
  } catch (error) {
    console.error(
      `Unexpected error while processing ${player.playerName}:`,
      error,
    )
    return "failed"
  }
}

const logOutcome = (
  playersProcessed: number,
  stats: Record<RegistrationOutcome, number>,
): void => {
  console.log(
    [
      `Processed ${playersProcessed} players.`,
      `Created: ${stats["created"]}`,
      `Alt updates: ${stats["alt-added"]}`,
      `Skipped (match): ${stats["skipped-primary"]}`,
      `Skipped (alt present): ${stats["skipped-alt"]}`,
      `Failed: ${stats["failed"]}`,
    ].join("\n"),
  )
}

const registerPlayers = async (
  players: PlayerRegistration[],
): Promise<void> => {
  if (players.length === 0) {
    console.log("No players found to register.")
    return
  }

  const playerClient = new PlayerPGClient()
  const stats: Record<RegistrationOutcome, number> = {
    "created": 0,
    "alt-added": 0,
    "skipped-primary": 0,
    "skipped-alt": 0,
    "failed": 0,
  }

  try {
    for (const player of players) {
      const outcome = await ensurePlayerRegistration(player, playerClient)
      stats[outcome] += 1

      if (outcome === "created") {
        console.log(
          `Registered ${player.playerName} (${player.discordId}).`,
        )
      } else if (outcome === "alt-added") {
        console.log(
          `Added alt ally code for ${player.playerName} (${player.discordId}).`,
        )
      } else if (outcome === "skipped-primary") {
        console.log(
          `Skipped ${player.playerName}: ally code already matches.`,
        )
      } else if (outcome === "skipped-alt") {
        console.log(
          `Skipped ${player.playerName}: ally code already stored as alt.`,
        )
      } else {
        console.error(
          `Failed to process ${player.playerName} (${player.discordId}).`,
        )
      }
    }
  } finally {
    await playerClient.disconnect()
  }

  logOutcome(players.length, stats)
}

;(async () => {
  let discordClient: Client | null = null
  try {
    ensureDatabaseEnv()
    ensureDiscordEnv()
    const filePath = getFilePath()
    console.log(`Loading player registrations from ${filePath}`)
    const rawPlayers = await loadPlayers(filePath)
    discordClient = await createDiscordClient()
    const players = await resolveDiscordIds(rawPlayers, discordClient)
    await registerPlayers(players)
  } catch (error) {
    console.error("Bulk player registration failed:", error)
    process.exitCode = 1
  } finally {
    discordClient?.destroy()
  }
})()


