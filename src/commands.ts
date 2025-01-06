import dotenv from "dotenv"
import PLAYER_COMMANDS from "./commands/player-commands"
import { InstallGlobalCommands } from "./utils"

dotenv.config({ path: ".prod.vars" })

const ALL_COMMANDS = [...PLAYER_COMMANDS]

InstallGlobalCommands(process.env.DISCORD_APPLICATION_ID, ALL_COMMANDS)
