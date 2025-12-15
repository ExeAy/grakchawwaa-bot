declare module "@swgoh-utils/comlink" {
  export interface ComlinkConfig {
    url: string
    accessKey?: string
    secretKey?: string
  }

  export interface ComlinkGuildMember {
    playerId: string
    playerName: string
    id: string
    name: string
    allyCode: string
    guildId: string
    playerLevel: number
    memberLevel: number
    lastActivityTime: string
    squadPower: number
    guildJoinTime: string
    galacticPower: string
    playerTitle: string
    playerPortrait: string
    leagueId: string
    memberContribution: any[]
    [key: string]: any
  }

  export interface ComlinkGuildData {
    guild: {
      id: string
      name: string
      desc: string
      member: ComlinkGuildMember[]
      [key: string]: any
    }
    [key: string]: any
  }

  export interface ComlinkPlayerData {
    [key: string]: any
  }

  export default class ComlinkStub {
    constructor(config: ComlinkConfig)
    fetchGuild(allyCode: string): Promise<ComlinkGuildData>
    fetchPlayer(allyCode: string): Promise<ComlinkPlayerData>
    [key: string]: any
  }
}
