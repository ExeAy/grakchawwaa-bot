declare module "@swgoh-utils/comlink" {
  interface ComlinkStubOptions {
    url?: string
    statsUrl?: string
    accessKey?: string
    secretKey?: string
    log?: Console
    compression?: boolean
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
    ): Promise<any>
    getLocalizationBundle(id: string, unzip?: boolean): Promise<any>
    getMetaData(): Promise<any>
    getPlayer(allyCode?: string, playerId?: string): Promise<any>
    getGuild(
      guildId: string,
      includeRecentGuildActivityInfo?: boolean,
    ): Promise<any>
    getGuildsByName(
      name: string,
      startIndex?: number,
      count?: number,
    ): Promise<any>
    getGuildsByCriteria(
      searchCriteria?: object,
      startIndex?: number,
      count?: number,
    ): Promise<any>
    getPlayerArenaProfile(
      allyCode?: string,
      playerId?: string,
      playerDetailsOnly?: boolean,
    ): Promise<any>
    // ...add more methods as needed from the JS source
  }
}
