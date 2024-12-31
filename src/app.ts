import {
  InteractionResponseType,
  InteractionType,
  verifyKeyMiddleware,
} from "discord-interactions"
import "dotenv/config"
import express from "express"
import { getRandomEmoji } from "./utils"

// Create an express app
const app = express()
// Get port, or default to 3000
const PORT = process.env.PORT || 3000

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post(
  "/interactions",
  verifyKeyMiddleware(process.env.PUBLIC_KEY!),
  async function (req, res) {
    // Interaction type and data
    const { type, data, id } = req.body
    console.log("interaction", req.body)

    /**
     * Handle verification requests
     */
    if (type === InteractionType.PING) {
      return res.send({ type: InteractionResponseType.PONG })
    }

    /**
     * Handle slash command requests
     * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
     */
    if (type === InteractionType.APPLICATION_COMMAND) {
      const { name } = data

      // "test" command
      if (name === "test") {
        // Send a message into the channel where command was triggered from
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            // Fetches a random emoji to send from a helper function
            content: `hello world ${getRandomEmoji()}`,
          },
        })
      }

      console.error(`unknown command: ${name}`)
      return res.status(400).json({ error: "unknown command" })
    }

    console.error("unknown interaction type", type)
    return res.status(400).json({ error: "unknown interaction type" })
  },
)

app.listen(PORT, () => {
  console.log("Listening on port", PORT)
})
