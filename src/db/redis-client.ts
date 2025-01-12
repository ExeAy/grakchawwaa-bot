import { container } from "@sapphire/framework"
import { RedisClientType, createClient } from "redis"

declare module "@sapphire/pieces" {
  interface Container {
    redisClient: RedisClientType
  }
}

const redis_url = process.env.HEROKU_REDIS_URI!

export const setupRedisClient = () => {
  container.redisClient = createClient({
    url: redis_url,
    socket: {
      tls: redis_url.match(/rediss:/) != null,
      rejectUnauthorized: false, // This allows self-signed certificates
    },
  })

  container.redisClient.on("error", (err) =>
    console.error("Redis Client Error", err),
  )
}
