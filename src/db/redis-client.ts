import { container } from "@sapphire/framework"
import { RedisClientType, createClient } from "redis"

declare module "@sapphire/pieces" {
  interface Container {
    redisClient: RedisClientType
  }
}

export const setupRedisClient = () => {
  container.redisClient = createClient({
    url: process.env.HEROKU_REDIS_URI,
    password: process.env.HEROKU_REDIS_PASSWORD,
    socket: {
      tls: true,
      rejectUnauthorized: false, // This allows self-signed certificates
    },
  })

  container.redisClient.on("error", (err) =>
    console.error("Redis Client Error", err),
  )
}
