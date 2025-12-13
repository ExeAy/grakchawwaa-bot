/**
 * Structured models for Territory Battle data
 */

export interface TerritoryBattle {
  isActive: boolean
  conflictZones: ConflictZone[]
  strikeZones: StrikeZone[]
  reconZones: ReconZone[]
}

export interface ZoneStatus {
  zoneId: string
  zoneState: number
  score: number
  channelId: string
  commandMessage: string
  commandState: number
}

export interface ConflictZone {
  status: ZoneStatus
}

export interface StrikeZone {
  playersParticipated: number
  status: ZoneStatus
}

export interface ReconZone {
  platoons: Platoon[]
  status: ZoneStatus
}

export interface Platoon {
  id: string
  squads: Squad[]
}

export interface Squad {
  id: string
  units: PlatoonUnit[]
}

export interface PlatoonUnit {
  unitIdentifier: string
  level: number
  memberId: string
  tier: number
  relicTier: number
}
