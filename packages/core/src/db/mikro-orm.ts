import { MikroORM } from "@mikro-orm/core"
import { PostgreSqlDriver } from "@mikro-orm/postgresql"
import config from "../mikro-orm.config"

let ormInstance: MikroORM<PostgreSqlDriver> | null = null

export const initializeMikroORM = async (): Promise<MikroORM<PostgreSqlDriver>> => {
  if (!ormInstance) {
    ormInstance = await MikroORM.init<PostgreSqlDriver>(config)
    console.log("MikroORM initialized successfully")
  }
  return ormInstance
}

export const getORM = (): MikroORM<PostgreSqlDriver> => {
  if (!ormInstance) {
    throw new Error("MikroORM not initialized. Call initializeMikroORM() first.")
  }
  return ormInstance
}

export const closeMikroORM = async (): Promise<void> => {
  if (ormInstance) {
    await ormInstance.close()
    ormInstance = null
    console.log("MikroORM connection closed")
  }
}
