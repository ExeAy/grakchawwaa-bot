/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  TicketViolationPGClient,
  TicketViolationRow,
} from "../ticket-violation-client"

// Access to the processRows method for testing
// We need to cast to any to access private method
const client = new TicketViolationPGClient()
const processRows = (rows: TicketViolationRow[]): TicketViolationRow[] => {
  return (client as any).processRows(rows)
}

describe("TicketViolationPGClient", () => {
  describe("processRows", () => {
    it("should convert string values in ticket_counts to numbers", () => {
      // Arrange
      const mockRows: TicketViolationRow[] = [
        {
          guild_id: "123456789",
          date: new Date(),
          ticket_counts: {
            // Type assertion to avoid type errors during test creation
            player1: "500" as unknown as number,
            player2: "600" as unknown as number,
          },
        },
      ]

      // Act
      const result = processRows(mockRows)

      // Assert
      expect(result[0]?.ticket_counts["player1"]).toBe(500)
      expect(result[0]?.ticket_counts["player2"]).toBe(600)
      expect(typeof result[0]?.ticket_counts["player1"]).toBe("number")
      expect(typeof result[0]?.ticket_counts["player2"]).toBe("number")
    })

    it("should handle mixed string and number values", () => {
      // Arrange
      const mockRows: TicketViolationRow[] = [
        {
          guild_id: "123456789",
          date: new Date(),
          ticket_counts: {
            player1: "500" as unknown as number,
            player2: 600,
          },
        },
      ]

      // Act
      const result = processRows(mockRows)

      // Assert
      expect(result[0]?.ticket_counts["player1"]).toBe(500)
      expect(result[0]?.ticket_counts["player2"]).toBe(600)
      expect(typeof result[0]?.ticket_counts["player1"]).toBe("number")
      expect(typeof result[0]?.ticket_counts["player2"]).toBe("number")
    })

    it("should return rows without ticket_counts unchanged", () => {
      // Arrange
      const mockRows: TicketViolationRow[] = [
        {
          guild_id: "123456789",
          date: new Date(),
          ticket_counts: {},
        },
      ]

      // Act
      const result = processRows(mockRows)

      // Assert
      expect(result).toEqual(mockRows)
    })
  })
})
