# grakchawwaa-bot

Discord bot for Star Wars: Galaxy of Heroes guild management.

## Commands

### Guild Commands

- `/register-ticket-collection` - Register a guild for ticket collection monitoring

  - `channel` - Discord channel to post ticket summaries (required)
  - `ally-code` - Ally code of a guild member (optional if already registered)

- `/unregister-ticket-collection` - Removes guild ticket collection monitoring

- `/register-anniversary-channel` - Register a channel for guild anniversary notifications

  - `channel` - Discord channel to post anniversary messages (required)
  - `ally-code` - Ally code of a guild member (optional if already registered)

- `/unregister-anniversary-channel` - Removes guild anniversary notifications

- `/get-guild-members` - Get a list of all members in a guild
  - `ally-code` - Ally code of a guild member (optional if already registered)

### Player Commands

- `/register-player` - Register a player with an ally code

  - `ally-code` - Ally code to register (required)

- `/unregister-player` - Remove a player registration

- `/identify` - Display information about a registered player

### Utility Commands

- `/ping` - Check if the bot is online and responsive

## Development

The bot is built using TypeScript, Sapphire Discord.js framework, and MikroORM for database access. The project uses a **pnpm monorepo** structure to share code between the Discord bot, future web app, and background worker.

### Project Structure

```
grakchawwaa-bot/
├── packages/
│   ├── core/                  # Shared database layer and business logic
│   │   ├── src/
│   │   │   ├── entities/      # MikroORM entities
│   │   │   ├── repositories/  # Database repositories
│   │   │   ├── migrations/    # Database migrations
│   │   │   ├── db/            # MikroORM initialization
│   │   │   └── utils/         # Shared utilities
│   │   └── package.json
│   ├── discord-bot/           # Discord bot application
│   │   ├── src/
│   │   │   ├── commands/      # Slash commands
│   │   │   ├── services/      # Bot services
│   │   │   └── index.ts       # Bot entry point
│   │   └── package.json
│   ├── web/                   # Future web app (placeholder)
│   └── worker/                # Future background worker (placeholder)
├── pnpm-workspace.yaml        # Workspace configuration
└── package.json               # Root package
```

### Prerequisites

- Node.js (v24 or higher)
- PNPM package manager
- Docker and Docker Compose (for local database setup)

### Setup

1. Clone the repository

```bash
git clone https://github.com/yourusername/grakchawwaa-bot.git
cd grakchawwaa-bot
```

2. Install dependencies (this installs all workspace packages)

```bash
pnpm install
```

3. Configure environment variables

- Create an `.env.dev` file in the root with the following:

  ```
    NODE_ENV=development

    DISCORD_APPLICATION_ID=your_application_id
    DISCORD_TOKEN=your_bot_token

    PGUSER=grakchawwaa
    PGHOST=postgres
    PGPORT=5432
    PGPASSWORD=dev_password
    PGDATABASE=grakchawwaa_dev

    COMLINK_URL=http://localhost:3000
    COMLINK_ACCESS_KEY=""
    COMLINK_SECRET_KEY=""
  ```

You will need to register your own discord bot (for manual testing) and setup your own [swgoh comlink instance](https://github.com/swgoh-utils/swgoh-comlink). From those you can fill in the values missing above.

### Database Setup

The easiest way to set up a local PostgreSQL database is using Docker:

```bash
# Start all services (PostgreSQL + Bot)
docker compose up -d

# Initialize database with schema and test data (run from inside container)
docker exec grakchawwaa-bot ts-node packages/discord-bot/infra/setupDockerDB.ts
```

This will:
- Start a PostgreSQL container with pre-configured credentials
- Start the bot in development mode
- Automatically run MikroORM migrations on startup
- Create all required tables

**Docker Database Credentials:**
- Host: `postgres` (inside container) or `localhost` (from host)
- Port: `5432`
- User: `grakchawwaa`
- Password: `dev_password`
- Database: `grakchawwaa_dev`

**Docker Commands:**
- `docker compose up -d` - Start all services in background
- `docker compose logs -f bot` - Follow bot logs
- `docker compose restart bot` - Restart bot container
- `docker compose down` - Stop all services
- `docker compose down -v` - Stop and delete database volume

**Monorepo Commands:**
- `pnpm build` - Build all packages
- `pnpm dev:bot` - Run Discord bot in development mode
- `pnpm dev:web` - Run web app (when implemented)
- `pnpm dev:worker` - Run background worker (when implemented)
- `pnpm lint` - Lint all packages
- `pnpm test` - Test all packages

**Migration Commands (run in core package):**
```bash
# Inside container
docker exec grakchawwaa-bot sh -c "cd packages/core && pnpm migration:create --name=description"
docker exec grakchawwaa-bot sh -c "cd packages/core && pnpm migration:up"
docker exec grakchawwaa-bot sh -c "cd packages/core && pnpm migration:down"
```

**Querying the Database:**

To query the database directly, you can use `psql` inside the Docker container:

```bash
# Connect to the database
docker exec -it grakchawwaa-postgres psql -U grakchawwaa -d grakchawwaa_dev
```

Once connected, you can run SQL queries:

```sql
-- List all tables
\dt

-- Query the players table
SELECT * FROM players;

-- Check table structure
\d players

-- Query with specific columns
SELECT discord_id, ally_code, registered_at FROM players;
```

Useful psql commands:
- `\dt` - List all tables
- `\d table_name` - Describe a table structure
- `\q` - Quit psql
- `\l` - List all databases

You can also run one-liner queries without entering interactive mode:

```bash
# Run a single query
docker exec -it grakchawwaa-postgres psql -U grakchawwaa -d grakchawwaa_dev -c "SELECT * FROM players;"

# Check table structure
docker exec -it grakchawwaa-postgres psql -U grakchawwaa -d grakchawwaa_dev -c "\d players"
```

## Deployment

This bot runs as a **worker dyno only** on Heroku (not a web dyno). 

**⚠️ IMPORTANT:** After deploying, scale the web dyno to 0 to prevent health check failures:

```bash
pnpm heroku-scale-web-zero
```

For complete deployment instructions, troubleshooting, and verification steps, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Legal Documents

The Terms of Service and Privacy Policy are published via GitHub Pages. After setting up GitHub Pages (see [docs/README.md](./docs/README.md)), they will be available at:

- Terms of Service: `https://[your-username].github.io/grakchawwaa-bot/terms-of-service.html`
- Privacy Policy: `https://[your-username].github.io/grakchawwaa-bot/privacy-policy.html`

To update these documents, simply edit the corresponding markdown files in the `docs/` directory and push to the repository.
