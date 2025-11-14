import { Client } from "pg"

interface TicketViolation {
  guild_id: string
  date: string
  ticket_counts: Record<string, number>
}

const insertTestData = async (): Promise<void> => {
  const client = new Client({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    port: parseInt(process.env.PGPORT || "5432", 10),
  })

  const guildId = "oAhUncGySeGpKznycCMgYQ"
  const playerIds = [
    "9i5caIFsRY26XTvKrlzixg",
    "uINBkfvgQoSt_LOjqgtFRw",
    "tu5Ez13lSQ6I6iUNKKYEbA",
    "ZqqN6ov5QWynuJynCMn8KQ",
    "4L_tpaapT0q1Fvxi3JzyAQ",
    "0Y2XQa7FrR-6uCY2kUNiWw",
    "4fpk3Jv2S4-yVX0nBlNDYQ",
    "m3A-tUP2S6abP1O8YkHtnA",
    "RE7NTh3cRbC7W1z2efbJiw",
    "3sB5E2DTQ5G8VeK2Pgu0SA",
    "xRz9g0I5S2Dk3Lf8PcnjYw",
    "PvQ7NWf1S1aWQ0p3U6Ztia",
  ]

  // Create test data for the last 7 days
  const testData: TicketViolation[] = []
  const now = new Date()

  for (let i = 0; i < 7; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    // Generate random ticket counts for all sample players
    const ticketCounts = playerIds.reduce<Record<string, number>>(
      (acc, playerId) => {
        acc[playerId] = Math.floor(Math.random() * 600)
        return acc
      },
      {},
    )

    testData.push({
      guild_id: guildId,
      date: date.toISOString(),
      ticket_counts: ticketCounts,
    })
  }

  try {
    await client.connect()

    // Insert test data
    for (const data of testData) {
      const query = `
        INSERT INTO ticketViolations (guild_id, date, ticket_counts)
        VALUES ($1, $2, $3)
        ON CONFLICT (guild_id, date) DO UPDATE 
        SET ticket_counts = $3
      `
      await client.query(query, [
        data.guild_id,
        data.date,
        JSON.stringify(data.ticket_counts),
      ])
    }

    console.log(
      `Successfully inserted ${testData.length} test records into ticketViolations table.`,
    )
  } catch (error) {
    console.error("Error inserting test data:", error)
  } finally {
    await client.end()
  }
}

;(async () => {
  try {
    await insertTestData()
    console.log("Test data insertion complete.")
  } catch (error) {
    console.error("Error during test data insertion:", error)
  }
})()
