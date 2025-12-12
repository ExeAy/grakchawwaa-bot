# CLAUDE.md - Project Context for AI Assistants

## Project Overview

**grakchawwaa-bot** is a Discord bot for Star Wars: Galaxy of Heroes (SWGOH) guild management. It helps guilds track ticket collection, monitor player anniversaries, and manage guild member information.

## Tech Stack

- **Runtime:** Node.js 24.x
- **Language:** TypeScript 5.9.3
- **Framework:** [Sapphire Framework](https://www.sapphirejs.dev/) (Discord.js wrapper)
- **Database:** PostgreSQL 16
- **Package Manager:** pnpm 10.10.0
- **External API:** SWGOH Comlink (game data API)
- **Testing:** Jest
- **Deployment:** Heroku (worker dyno only)

## Project Structure

```
├── src/
│   ├── commands/          # Discord slash commands
│   ├── db/                # Database clients and queries
│   ├── services/          # Business logic services
│   │   ├── comlink/       # SWGOH Comlink API integration
│   │   ├── ticket-monitor.ts
│   │   ├── anniversary-monitor.ts
│   │   └── violation-summary.ts
│   ├── model/             # Data models
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── tests/             # Test files
│   ├── index.ts           # Main entry point
│   └── discord-bot-client.ts
├── infra/                 # Infrastructure scripts (DB setup, command reset)
├── docs/                  # Legal documents (ToS, Privacy Policy)
├── docker-compose.yml     # Local PostgreSQL setup
└── package.json
```

## Core Functionality

### 1. Ticket Collection Monitoring
- Monitors guild members' ticket contributions (600 tickets per day expected)
- Posts daily summaries to a configured Discord channel
- Tracks violations and generates reports

### 2. Anniversary Notifications
- Tracks when players joined their guild
- Posts anniversary messages to a configured channel

### 3. Guild Management
- Fetch guild member lists via ally codes
- Player registration system linking Discord users to SWGOH accounts

## Key Services

### TicketMonitorService
- Runs periodic checks (every 6 hours)
- Fetches guild data from Comlink API
- Identifies ticket violations
- Posts summaries to Discord

### AnniversaryMonitorService
- Checks for player guild anniversaries
- Posts celebration messages

### ViolationSummaryService
- Formats violation reports
- Handles "Show Full List" button interactions

### ComlinkService
- Interfaces with SWGOH Comlink API for game data
- Caches player/guild data to reduce API calls

## Database Schema

### Tables
- `players` - Discord ID → Ally Code mappings, registration timestamps
- `guild_message_channels` - Guild → Discord channel mappings for notifications
- `ticket_violations` - Historical ticket violation records

## Development Setup

### Prerequisites
- Node.js 24.x
- pnpm
- Docker & Docker Compose
- Discord Bot Token
- SWGOH Comlink instance (self-hosted API)

### Environment Variables (.env.dev)
```bash
NODE_ENV=development
PORT=3200
APP_NAME=grakchawaa

# Required: Discord Bot Configuration
# Get from: https://discord.com/developers/applications
DISCORD_APPLICATION_ID=your_app_id
DISCORD_TOKEN=your_bot_token
DISCORD_PUBLIC_KEY=your_public_key

# Database (use 'postgres' for Docker, 'localhost' for local)
PGUSER=grakchawwaa
PGHOST=postgres  # Use 'localhost' if running bot locally
PGPORT=5432
PGPASSWORD=dev_password
PGDATABASE=grakchawwaa_dev

# Optional: SWGOH Comlink (can be left empty for basic testing)
COMLINK_URL=
COMLINK_ACCESS_KEY=
COMLINK_SECRET_KEY=
```

### Quick Start (Docker - Recommended)
```bash
# 1. Create .env.dev with Discord credentials (see above)

# 2. Start all services (PostgreSQL + Bot with Node.js 24)
docker compose up -d

# 3. Create database tables
docker exec -i grakchawwaa-postgres psql -U grakchawwaa -d grakchawwaa_dev << 'EOF'
CREATE TABLE IF NOT EXISTS players (
  discord_id text NOT NULL PRIMARY KEY,
  ally_code char(9) NOT NULL,
  alt_ally_codes char(9)[],
  registered_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticketViolations (
  guild_id text NOT NULL,
  date timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ticket_counts jsonb NOT NULL,
  PRIMARY KEY (guild_id, date)
);

CREATE TABLE IF NOT EXISTS guildMessageChannels (
  guild_id text NOT NULL PRIMARY KEY,
  ticket_collection_channel_id text,
  next_ticket_collection_refresh_time text,
  ticket_reminder_channel_id text,
  anniversary_channel_id text
);
EOF

# 4. View logs
docker compose logs -f bot

# 5. Invite bot to your server
# https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&permissions=2147534848&scope=bot%20applications.commands
```

### Alternative: Local Setup
```bash
# Requires Node.js 24.x installed locally
# 1. Install dependencies
pnpm install

# 2. Start only PostgreSQL in Docker
docker compose up -d postgres

# 3. Update PGHOST=localhost in .env.dev

# 4. Create database tables (same SQL as above via psql)

# 5. Run bot locally
pnpm dev
```

### Docker Commands
- `docker compose up -d` - Start all services in background
- `docker compose logs -f bot` - Follow bot logs
- `docker compose restart bot` - Restart bot (e.g., after env changes)
- `docker compose down` - Stop all services
- `docker compose down -v` - Stop and delete database volume

### Testing
```bash
pnpm test           # Run all tests
pnpm test:watch     # Watch mode
pnpm test:coverage  # With coverage
```

## Important Notes

1. **Comlink Dependency:** The bot requires a self-hosted SWGOH Comlink instance. This is an unofficial API that extracts data from the game. See: https://github.com/swgoh-utils/swgoh-comlink

2. **Heroku Deployment:**
   - Runs as worker dyno (not web)
   - Must scale web dyno to 0: `pnpm heroku-scale-web-zero`
   - See [DEPLOYMENT.md](./DEPLOYMENT.md) for details

3. **Discord Bot Setup:**
   - Create application at https://discord.com/developers/applications
   - Enable these intents in Bot settings:
     - ✅ Message Content Intent (privileged)
     - ✅ Server Members Intent
     - ✅ Presence Intent
   - Generate OAuth2 invite URL with `bot` + `applications.commands` scopes

4. **Rate Limiting:** The bot implements caching to avoid hitting Comlink rate limits

5. **Legal Docs:** Terms of Service and Privacy Policy are published via GitHub Pages (see [docs/README.md](./docs/README.md))

6. **Commit Messages:** This project uses conventional commits (e.g., `feat:`, `fix:`, `docs:`, `chore:`)

## Commands (Slash Commands)

All commands are registered as Discord slash commands using the Sapphire framework.

### Guild Commands
- `/register-ticket-collection` - Start monitoring ticket collection
- `/unregister-ticket-collection` - Stop monitoring
- `/register-anniversary-channel` - Setup anniversary notifications
- `/unregister-anniversary-channel` - Remove notifications
- `/get-guild-members` - List all guild members

### Player Commands
- `/register-player` - Link Discord user to ally code
- `/unregister-player` - Remove player registration
- `/identify` - Show registered player info

### Utility Commands
- `/ping` - Bot health check

## Code Patterns

### Sapphire Framework
The bot uses Sapphire's command structure:
- Commands are classes extending `Command` from `@sapphire/framework`
- Placed in `src/commands/` directory
- Auto-discovered and registered

### Database Access
- Uses `pg` library directly (no ORM)
- Client instances created via `setupPostgresClients()`
- Separate client classes for each domain (`player-client.ts`, `guild-message-channels-client.ts`, etc.)

### Service Pattern
- Services encapsulate business logic
- Initialized in `index.ts`
- Use dependency injection where applicable

## Testing Strategy

- Jest for unit/integration tests
- Tests colocated with source in `__tests__/` directories
- Test files mirror source structure
- Coverage tracking enabled

## Contributing

1. Follow existing code patterns
2. Use TypeScript strict mode
3. Run `pnpm lint` and `pnpm format` before committing
4. Add tests for new features
5. Update this file if adding major features/changes

## Useful Resources

- [Sapphire Framework Docs](https://www.sapphirejs.dev/)
- [Discord.js Docs](https://discord.js.org/)
- [SWGOH Comlink](https://github.com/swgoh-utils/swgoh-comlink)
- [SWGOH Comlink Utils](https://github.com/swgoh-utils/swgoh-utils)

## Recent Changes (from git log)

- ✨ Implement success notification for perfect ticket collection
- 📝 Add timestamp on registration for legal reasons
- 📝 Revise Privacy Policy and Terms of Service
- 📝 Update description format in configuration file
- Legal documentation improvements (#17)
