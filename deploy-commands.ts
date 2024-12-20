import { REST, Routes } from "discord.js"
import dotenv from "dotenv"
import fs from "fs"
import path from "path"
import { Command, CommandData } from "./src/model/command"

// Load the environment variables from the .env file
dotenv.config()

const commands: CommandData[] = []
// Grab all the command folders from the commands directory you created earlier
const foldersPath = path.join(__dirname, "dist/src/commands")
const commandFolders = fs.readdirSync(foldersPath)

for (const folder of commandFolders) {
  // Grab all the command files from the commands directory you created earlier
  const commandsPath = path.join(foldersPath, folder)
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"))
  // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file)
    const command: Command = require(filePath)
    console.log(`Deploying command at ${filePath}`)
    console.log(command)
    if (
      Object.prototype.hasOwnProperty.call(command, "data") &&
      Object.prototype.hasOwnProperty.call(command, "execute")
    ) {
      commands.push(command.data)
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
      )
    }
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN as string)

// and deploy your commands!
;(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`,
    )

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID as string),
      { body: commands },
    )

    console.log(
      `Successfully reloaded ${(data as any).length} application (/) commands.`,
    )
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error)
  }
})()
