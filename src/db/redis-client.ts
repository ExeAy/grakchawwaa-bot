import { RedisClientType, createClient } from "redis"

let redisClient: RedisClientType

export const setupRedisClient = () => {
  redisClient = createClient({
    url: process.env.HEROKU_REDIS_URI,
    password: process.env.HEROKU_REDIS_PASSWORD,
    socket: {
      tls: true,
      rejectUnauthorized: false, // This allows self-signed certificates
    },
  })

  redisClient.on("error", (err) => console.error("Redis Client Error", err))
}

export const getRedisClient = () => {
  return redisClient
}
