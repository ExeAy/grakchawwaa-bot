import crypto from "crypto"
import {
  TerritoryBattle,
  ConflictZone,
  StrikeZone,
  ReconZone,
  ZoneStatus,
  Platoon,
  Squad,
  PlatoonUnit,
} from "../../model/territory-battle"

export interface MhanndalorianClientConfig {
  apiKey: string
  discordId: string
  allyCode: string
  baseUrl?: string
}

export interface PlayerPayload {
  allyCode: string
  userDiscordId: string
  enums?: boolean
}

export interface TBPayload {
  allyCode: string
  userDiscordId: string
  enums?: boolean
}

export interface PlayerResponse {
  // Basic player info
  name: string
  allyCode: number
  guildId?: string
  level?: number

  // We'll expand this as we discover more fields
  [key: string]: unknown
}

interface RawZoneStatus {
  zoneId: string
  zoneState: number
  score: string
  channelId: string
  commandMessage?: string
  commandState: number
}

interface RawConflictZone {
  zoneStatus: RawZoneStatus
}

interface RawStrikeZone {
  playersParticipated: number
  zoneStatus: RawZoneStatus
}

interface RawUnit {
  unitIdentifier: string
  level: number
  memberId: string
  tier: number
  unitRelicTier: number
}

interface RawSquad {
  unit: RawUnit[]
  id: string
}

interface RawPlatoon {
  squad: RawSquad[]
  id: string
}

interface RawReconZone {
  platoon: RawPlatoon[]
  zoneStatus: RawZoneStatus
}

export interface TBResponse {
  code: number
  territoryBattleStatus?: {
    conflictZoneStatus?: RawConflictZone[]
    strikeZoneStatus?: RawStrikeZone[]
    reconZoneStatus?: RawReconZone[]
  }
  [key: string]: unknown
}

export class MhanndalorianClient {
  private readonly apiKey: string
  private readonly discordId: string
  private readonly allyCode: string
  private readonly baseUrl: string

  constructor(config: MhanndalorianClientConfig) {
    this.apiKey = config.apiKey
    this.discordId = config.discordId
    this.allyCode = config.allyCode
    this.baseUrl = config.baseUrl || "https://mhanndalorianbot.work/api"
  }

  /**
   * Generates HMAC signature for authenticated requests
   */
  private generateHMAC(method: string, endpoint: string, payload: unknown): {
    signature: string
    timestamp: number
  } {
    const timestamp = Date.now()
    const hmac = crypto.createHmac("sha256", this.apiKey)

    // Add timestamp
    hmac.update(timestamp.toString())

    // Add method (uppercase)
    hmac.update(method.toUpperCase())

    // Add endpoint (lowercase)
    hmac.update(endpoint.toLowerCase())

    // Add MD5 hash of payload
    const payloadString = JSON.stringify(payload)
    const payloadHash = crypto.createHash("md5").update(payloadString).digest("hex")
    hmac.update(payloadHash)

    const signature = hmac.digest("hex")

    return { signature, timestamp }
  }

  /**
   * Makes an authenticated request to the API
   */
  private async makeRequest<T>(
    endpoint: string,
    payload: unknown,
    useHMAC: boolean = false,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const method = "POST"

    const requestBody = { payload }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept-Encoding": "br,gzip,deflate",
    }

    if (useHMAC) {
      const { signature, timestamp } = this.generateHMAC(method, endpoint, payload)
      headers["x-signature"] = signature
      headers["x-timestamp"] = timestamp.toString()
      headers["x-discord-id"] = this.discordId
    } else {
      // Less secure method
      headers["api-key"] = this.apiKey
      headers["x-discord-id"] = this.discordId
    }

    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Mhanndalorian API error (${response.status}): ${errorText}`,
      )
    }

    return response.json() as Promise<T>
  }

  /**
   * Get player data by ally code
   */
  public async getPlayer(
    allyCode?: string,
    enums: boolean = false,
  ): Promise<PlayerResponse> {
    const payload: PlayerPayload = {
      allyCode: allyCode || this.allyCode,
      userDiscordId: this.discordId,
      enums,
    }

    return this.makeRequest<PlayerResponse>("/player", payload)
  }

  /**
   * Get Territory Battle data including platoons and leaderboards
   */
  public async getTB(
    allyCode?: string,
    enums: boolean = false,
  ): Promise<TerritoryBattle> {
    const payload: TBPayload = {
      allyCode: allyCode || this.allyCode,
      userDiscordId: this.discordId,
      enums,
    }

    const response = await this.makeRequest<TBResponse>("/tb", payload)
    return this.transformTBResponse(response)
  }

  /**
   * Transform raw TB API response into structured TerritoryBattle model
   */
  private transformTBResponse(response: TBResponse): TerritoryBattle {
    const status = response.territoryBattleStatus

    if (!status) {
      return {
        isActive: false,
        conflictZones: [],
        strikeZones: [],
        reconZones: [],
      }
    }

    return {
      isActive: true,
      conflictZones: this.transformConflictZones(status.conflictZoneStatus || []),
      strikeZones: this.transformStrikeZones(status.strikeZoneStatus || []),
      reconZones: this.transformReconZones(status.reconZoneStatus || []),
    }
  }

  private transformConflictZones(zones: RawConflictZone[]): ConflictZone[] {
    return zones.map((zone) => ({
      status: {
        zoneId: zone.zoneStatus.zoneId,
        zoneState: zone.zoneStatus.zoneState,
        score: parseInt(zone.zoneStatus.score),
        channelId: zone.zoneStatus.channelId,
        commandMessage: zone.zoneStatus.commandMessage || "",
        commandState: zone.zoneStatus.commandState,
      },
    }))
  }

  private transformStrikeZones(zones: RawStrikeZone[]): StrikeZone[] {
    return zones.map((zone) => ({
      playersParticipated: zone.playersParticipated,
      status: {
        zoneId: zone.zoneStatus.zoneId,
        zoneState: zone.zoneStatus.zoneState,
        score: parseInt(zone.zoneStatus.score),
        channelId: zone.zoneStatus.channelId,
        commandMessage: zone.zoneStatus.commandMessage || "",
        commandState: zone.zoneStatus.commandState,
      },
    }))
  }

  private transformReconZones(zones: RawReconZone[]): ReconZone[] {
    return zones.map((zone) => ({
      platoons: this.transformPlatoons(zone.platoon),
      status: {
        zoneId: zone.zoneStatus.zoneId,
        zoneState: zone.zoneStatus.zoneState,
        score: parseInt(zone.zoneStatus.score),
        channelId: zone.zoneStatus.channelId,
        commandMessage: zone.zoneStatus.commandMessage || "",
        commandState: zone.zoneStatus.commandState,
      },
    }))
  }

  private transformPlatoons(platoons: RawPlatoon[]): Platoon[] {
    return platoons.map((platoon) => ({
      id: platoon.id,
      squads: this.transformSquads(platoon.squad),
    }))
  }

  private transformSquads(squads: RawSquad[]): Squad[] {
    return squads.map((squad) => ({
      id: squad.id,
      units: this.transformUnits(squad.unit),
    }))
  }

  private transformUnits(units: RawUnit[]): PlatoonUnit[] {
    return units.map((unit) => ({
      unitIdentifier: unit.unitIdentifier,
      level: unit.level,
      memberId: unit.memberId,
      tier: unit.tier,
      relicTier: unit.unitRelicTier,
    }))
  }
}
