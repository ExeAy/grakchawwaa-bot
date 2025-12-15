# CLAUDE.md - Project Context for AI Assistants

## Project Overview

**grakchawwaa-bot** is a Discord bot for Star Wars: Galaxy of Heroes (SWGOH) guild management. It helps guilds track ticket collection, monitor player anniversaries, and manage guild member information.

## Tech Stack

- **Runtime:** Node.js 24.x
- **Language:** TypeScript 5.9.3
- **Framework:** [Sapphire Framework](https://www.sapphirejs.dev/) (Discord.js wrapper)
- **Database:** PostgreSQL 16
- **ORM:** [MikroORM](https://mikro-orm.io/) 6.6.2
- **Package Manager:** pnpm 10.10.0
- **External API:** SWGOH Comlink (game data API)
- **Testing:** Jest
- **Deployment:** Heroku (worker dyno only)

## Project Structure

```
├── src/
│   ├── commands/          # Discord slash commands
│   ├── db/                # Database initialization
│   ├── entities/          # MikroORM entities
│   ├── repositories/      # Custom MikroORM repositories
│   ├── migrations/        # Database migrations
│   ├── services/          # Business logic services
│   │   ├── comlink/       # SWGOH Comlink API integration
│   │   ├── ticket-monitor.ts
│   │   ├── anniversary-monitor.ts
│   │   └── violation-summary.ts
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── tests/             # Test files
│   ├── index.ts           # Main entry point
│   ├── mikro-orm.config.ts # MikroORM configuration
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

The application uses **MikroORM** for database access with TypeScript entities and custom repositories.

### Tables
- `players` - Discord ID → Ally Code mappings, registration timestamps
- `guildMessageChannels` - Guild → Discord channel mappings for notifications
- `ticketViolations` - Historical ticket violation records
- `mikro_orm_migrations` - Migration tracking

### Entities
- `Player` ([src/entities/Player.entity.ts](src/entities/Player.entity.ts))
- `GuildMessageChannels` ([src/entities/GuildMessageChannels.entity.ts](src/entities/GuildMessageChannels.entity.ts))
- `TicketViolation` ([src/entities/TicketViolation.entity.ts](src/entities/TicketViolation.entity.ts))

### Repositories
Custom repositories extend `EntityRepository` with domain-specific methods:
- `PlayerRepository` - Player registration, lookup by ally code
- `GuildMessageChannelsRepository` - Guild channel configuration
- `TicketViolationRepository` - Violation tracking and reporting

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

# 3. Create database tables and run migrations
docker exec grakchawwaa-bot pnpm ts-node infra/setupDockerDB.ts
docker exec grakchawwaa-bot pnpm migration:up

# 4. View logs
docker compose logs -f bot

# 5. Invite bot to your server
# https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&permissions=2147534848&scope=bot%20applications.commands
```

### Database Migrations
```bash
# Create a new migration
docker exec grakchawwaa-bot pnpm migration:create --name=description

# Run pending migrations
docker exec grakchawwaa-bot pnpm migration:up

# Rollback last migration
docker exec grakchawwaa-bot pnpm migration:down

# Show pending migrations
docker exec grakchawwaa-bot pnpm mikro-orm migration:pending
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
- Uses **MikroORM** for type-safe database operations
- Entities defined with decorators in `src/entities/`
- Custom repositories in `src/repositories/`
- Migration-based schema management
- Repositories injected via Sapphire container (`container.playerRepository`, etc.)

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

- 🔧 Migrate database layer to MikroORM (entities, repositories, migrations)
- ✨ Implement success notification for perfect ticket collection
- 📝 Add timestamp on registration for legal reasons
- 📝 Revise Privacy Policy and Terms of Service
- 📝 Update description format in configuration file
- Legal documentation improvements (#17)
