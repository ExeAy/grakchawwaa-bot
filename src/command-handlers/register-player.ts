import { Player } from "../model/player"

export const registerPlayer = async (player: Player) => {
  console.log(
    `Player registered with ally code: ${player.allyCode} has been registered.`,
  )
}
