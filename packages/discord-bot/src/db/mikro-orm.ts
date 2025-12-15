import { MikroORM } from "@mikro-orm/core"
import { PostgreSqlDriver } from "@mikro-orm/postgresql"
import { container } from "@sapphire/pieces"
import config from "../mikro-orm.config"

declare module "@sapphire/pieces" {
  interface Container {
    orm: MikroORM<PostgreSqlDriver>
  }
}

export const initializeMikroORM = async (): Promise<void> => {
  const orm = await MikroORM.init<PostgreSqlDriver>(config)
  container.orm = orm
  console.log("MikroORM initialized successfully")
}

export const closeMikroORM = async (): Promise<void> => {
  if (container.orm) {
    await container.orm.close()
    console.log("MikroORM connection closed")
  }
}
