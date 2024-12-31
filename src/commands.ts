import "dotenv/config"
import { CommandOptionType, CommandType } from "./model/discord-models"
import { InstallGlobalCommands } from "./utils"

// Simple test command
const TEST_COMMAND = {
  name: "test",
  description: "Basic command",
  type: CommandType.CHAT_INPUT,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
}

const REGISTER_PLAYER_COMMAND = {
  name: "register-player",
  description: "Register a player",
  options: [
    {
      name: "ally-code",
      description: "Ally code to register",
      type: CommandOptionType.STRING,
      required: true,
    },
    {
      name: "discord-user",
      description: "Discord used (if different from the one registering)",
      type: CommandOptionType.USER,
      required: false,
    },
  ],
  type: CommandType.CHAT_INPUT,
}

const ALL_COMMANDS = [TEST_COMMAND, REGISTER_PLAYER_COMMAND]

InstallGlobalCommands(process.env.DISCORD_APPLICATION_ID, ALL_COMMANDS)
