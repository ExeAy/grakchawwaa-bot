import { Client } from "pg"

interface TicketViolation {
  guild_id: string
  date: string
  ticket_counts: Record<string, number>
}

const insertTestData = async (): Promise<void> => {
  const client = new Client({
    user: "hfal0t",
    host: "localhost",
    database: "grakchawaa",
    port: 5432,
  })

  const guildId = "oAhUncGySeGpKznycCMgYQ"

  // Create test data for the last 7 days
  const testData: TicketViolation[] = []
  const now = new Date()

  for (let i = 0; i < 7; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    // Generate random ticket counts for 5 players
    const ticketCounts = {
      "9i5caIFsRY26XTvKrlzixg": Math.floor(Math.random() * 600),
      uINBkfvgQoSt_LOjqgtFRw: Math.floor(Math.random() * 600),
      tu5Ez13lSQ6I6iUNKKYEbA: Math.floor(Math.random() * 600),
      ZqqN6ov5QWynuJynCMn8KQ: Math.floor(Math.random() * 600),
      "4L_tpaapT0q1Fvxi3JzyAQ": Math.floor(Math.random() * 600),
    }

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
