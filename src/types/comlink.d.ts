/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "@swgoh-utils/comlink" {
  interface ComlinkStubOptions {
    url?: string
    statsUrl?: string
    accessKey?: string
    secretKey?: string
    log?: Console
    compression?: boolean
  }

  export interface ComlinkGuildMemberContribution {
    type: number // 1 = Guild Activities, 2 = Raid Tickets, 3 = Gear Donations
    currentValue: number
    lifetimeValue: number
  }

  export interface ComlinkGuildMember {
    playerId: string
    playerName: string
    playerLevel: number
    memberLevel: number
    lastActivityTime: string
    squadPower: number
    guildJoinTime: string
    galacticPower: string
    playerTitle: string
    playerPortrait: string
    leagueId: string
    memberContribution?: ComlinkGuildMemberContribution[]
    // ...other fields as needed
  }

  export interface ComlinkGuildProfile {
    id: string
    name: string
    externalMessageKey: string
    memberCount: number
    memberMax: number
    levelRequirement: number
    guildGalacticPower: string
    bannerColorId: string
    bannerLogoId: string
    // ...other fields as needed
  }

  export interface ComlinkGuildRaidMember {
    playerId: string
    memberProgress: number
    rank: number
  }

  export interface ComlinkGuildRaidResult {
    raidId: string
    identifier: Record<string, any>
    duration: string
    endTime: string
    outcome: number
    raidMember: ComlinkGuildRaidMember[]
  }

  export interface ComlinkGuildData {
    guild: {
      member: ComlinkGuildMember[]
      recentRaidResult: ComlinkGuildRaidResult[]
      profile: ComlinkGuildProfile
      nextChallengesRefresh: string
      // ...other fields as needed
    }
  }

  export interface ComlinkPlayerUnit {
    id: string
    definitionId: string
    rarity: number
    level: number
    gear: number
    relic: { currentTier: number }
    // ...other fields as needed
  }

  export interface ComlinkPlayerData {
    name: string
    allyCode: number
    playerId: string
    level: number
    guildId?: string
    guildName?: string
    // ...other fields as needed
  }

  export interface ComlinkGameUnit {
    id: string
    nameKey: string
    baseId: string
    combatType: number
    // ...other fields as needed
  }

  export interface ComlinkGameData {
    units: ComlinkGameUnit[]
    // ...other fields as needed
  }

  export default class ComlinkStub {
    constructor(options?: ComlinkStubOptions)

    // Public methods (async, return Promise<any> for now)
    getUnitStats(
      requestPayload: any,
      flags?: string[],
      lang?: string,
    ): Promise<any>
    getEnums(): Promise<any>
    getEvents(): Promise<any>
    getGameData(
      version: string,
      includePveUnits?: boolean,
      requestSegment?: number,
    ): Promise<ComlinkGameData>
    getLocalizationBundle(id: string, unzip?: boolean): Promise<any>
    getMetaData(): Promise<any>
    getPlayer(allyCode?: string, playerId?: string): Promise<ComlinkPlayerData>
    getGuild(
      guildId: string,
      includeRecentGuildActivityInfo?: boolean,
    ): Promise<ComlinkGuildData>
    getGuildsByName(
      name: string,
      startIndex?: number,
      count?: number,
    ): Promise<{ profile: ComlinkGuildProfile }[]>
    getGuildsByCriteria(
      searchCriteria?: object,
      startIndex?: number,
      count?: number,
    ): Promise<{ profile: ComlinkGuildProfile }[]>
    getPlayerArenaProfile(
      allyCode?: string,
      playerId?: string,
      playerDetailsOnly?: boolean,
    ): Promise<any>
    // ...add more methods as needed from the JS source
  }
}
