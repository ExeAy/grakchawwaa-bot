import { TextChannel } from "discord.js"

const DISCORD_MESSAGE_LIMIT = 2000

/**
 * Splits a message into chunks and sends them to a Discord channel
 * @param channel The Discord text channel to send to
 * @param content The message content to send
 * @param options Optional settings for message splitting
 */
export async function sendLongMessage(
  channel: TextChannel,
  content: string,
  options: {
    splitOn?: string[] // Characters to prefer splitting on, in order of preference
    preserveFormat?: boolean // Whether to preserve markdown formatting across splits
  } = {},
): Promise<void> {
  const { preserveFormat = true } = options

  if (content.length <= DISCORD_MESSAGE_LIMIT) {
    await channel.send(content)
    return
  }

  const chunks: string[] = []
  let currentChunk = ""
  let currentFormat = "" // Tracks current markdown formatting

  const lines = content.split("\n")

  for (const line of lines) {
    // Check if adding this line would exceed the limit
    const potentialChunk = currentChunk + (currentChunk ? "\n" : "") + line

    if (potentialChunk.length <= DISCORD_MESSAGE_LIMIT) {
      currentChunk = potentialChunk
    } else {
      // If we need to preserve format and have active formatting, add it to next chunk
      if (preserveFormat) {
        // Extract current formatting (e.g., code blocks, bold, etc.)
        currentFormat = extractActiveFormatting(currentChunk)
      }

      chunks.push(currentChunk)
      currentChunk = currentFormat + line
    }
  }

  // Push the last chunk if it's not empty
  if (currentChunk) {
    chunks.push(currentChunk)
  }

  // Send all chunks in sequence
  for (const chunk of chunks) {
    await channel.send(chunk)
  }
}

/**
 * Extracts active markdown formatting from the end of a string
 * Handles common markdown like code blocks, bold, italic, etc.
 */
function extractActiveFormatting(text: string): string {
  let format = ""

  // Check for code block
  if (text.includes("```") && (text.match(/```/g) || []).length % 2 !== 0) {
    format += "```"
  }

  // Check for inline code
  if (text.includes("`") && (text.match(/`/g) || []).length % 2 !== 0) {
    format += "`"
  }

  // Check for bold
  if (text.includes("**") && (text.match(/\*\*/g) || []).length % 2 !== 0) {
    format += "**"
  }

  // Check for italic
  if (text.includes("*") && (text.match(/\*/g) || []).length % 2 !== 0) {
    format += "*"
  }

  return format
}
