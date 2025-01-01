import { InteractionResponseType } from "discord-interactions"
import { JsonResponse } from "../model/json-response"

export const writeRespondMessage = async (
  message: string,
): Promise<JsonResponse> => {
  try {
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: message,
      },
    })
  } catch (error) {
    console.error(`KV returned error: ${error}`)
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `An error occurred while writing message.`,
      },
    })
  }
}
