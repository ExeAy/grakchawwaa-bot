import {
  Command,
  CommandOptionType,
  CommandType,
} from "../model/discord-models"

const REGISTER_PLAYER_COMMAND = {
  name: Command.RegisterPlayer,
  description: "Register a player",
  version: "1.0.0",
  options: [
    {
      name: "ally-code",
      description: "Ally code to register",
      type: CommandOptionType.STRING,
      required: true,
    },
  ],
  type: CommandType.CHAT_INPUT,
}

const UNREGISTER_PLAYER_COMMAND = {
  name: Command.UnregisterPlayer,
  description: "Unregister a player",
  version: "1.0.0",
  options: [
    {
      name: "ally-code",
      description: "Ally code to unregister",
      type: CommandOptionType.STRING,
      required: false,
    },
  ],
  type: CommandType.CHAT_INPUT,
}

const IDENTIFY_PLAYER_COMMAND = {
  name: Command.IdentifyPLayer,
  description: "Get saved information about the user",
  version: "1.0.0",
  type: CommandType.CHAT_INPUT,
}

export default [
  REGISTER_PLAYER_COMMAND,
  UNREGISTER_PLAYER_COMMAND,
  IDENTIFY_PLAYER_COMMAND,
]
