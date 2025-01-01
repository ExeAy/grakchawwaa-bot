/**
 * The core server that runs on a Cloudflare worker.
 */

import {
  InteractionResponseType,
  InteractionType,
  verifyKey,
} from "discord-interactions"
import { AutoRouter, IRequest } from "itty-router"
import { registerPlayer } from "./command-handlers/register-player"
import { Command } from "./model/discord-models"
import { Environment } from "./model/environment"
import { JsonResponse } from "./model/json-response"
import { DiscordUser } from "./model/player"

const router = AutoRouter()

/**
 * A simple :wave: hello page to verify the worker is working.
 */
router.get("/", (_request, env: Environment) => {
  return new Response(`👋 ${env.DISCORD_APPLICATION_ID}`)
})

/**
 * Main route for all requests sent from Discord.  All incoming messages will
 * include a JSON payload described here:
 * https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object
 */
router.post("/", async (request, env) => {
  const { isValid, interaction } = await server.verifyDiscordRequest(
    request,
    env,
  )

  if (!isValid || !interaction) {
    return new Response("Bad request signature.", { status: 401 })
  }

  if (interaction.type === InteractionType.PING) {
    // The `PING` message is used during the initial webhook handshake, and is
    // required to configure the webhook in the developer portal.
    return new JsonResponse({
      type: InteractionResponseType.PONG,
    })
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    switch (interaction.data.name.toLowerCase()) {
      case Command.RegisterPlayer: {
        const discordUser: DiscordUser = interaction.data.options[1]
          ? { id: interaction.data.options[1].value }
          : { id: interaction.member.user.id }
        return await registerPlayer(
          {
            discordUser,
            allyCode: interaction.data.options[0].value,
          },
          env,
        )
      }

      default:
        return new JsonResponse({ error: "Unknown Type" }, { status: 400 })
    }
  }

  console.error("Unknown Type")
  return new JsonResponse({ error: "Unknown Type" }, { status: 400 })
})
router.all("*", () => new Response("Not Found.", { status: 404 }))

async function verifyDiscordRequest(request: IRequest, env: Environment) {
  const signature = request.headers.get("x-signature-ed25519")
  const timestamp = request.headers.get("x-signature-timestamp")
  const body = await request.text()
  const isValidRequest =
    signature &&
    timestamp &&
    (await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY))
  if (!isValidRequest) {
    return { isValid: false }
  }

  return { interaction: JSON.parse(body), isValid: true }
}

const server = {
  verifyDiscordRequest,
  fetch: router.fetch,
}

export default server
