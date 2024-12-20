import { CommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command } from "../../model/command"

module.exports = {
  data: new SlashCommandBuilder()
    .setName("register-ticket-channel")
    .setDescription("Register a channel as a channel for ticket collection."),
  execute: async (interaction: CommandInteraction) => {
    // Do something here

    await interaction.reply("Channel registered!")
  },
} as Command
