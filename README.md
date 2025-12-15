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

The bot is built using TypeScript, Sapphire Discord.js framework, and MikroORM for database access.

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

2. Install dependencies

```bash
pnpm install
```

3. Configure environment variables

- Create an `.env.dev` file with the following attributes:

  ```
    NODE_ENV=development
    PORT=3200
    APP_NAME=grakchawaa

    DISCORD_APPLICATION_ID=
    DISCORD_TOKEN=
    DISCORD_PUBLIC_KEY=

    PGUSER=
    PGHOST=
    PGPORT=
    PGPASSWORD=
    PGDATABASE=

    COMLINK_URL=
    COMLINK_ACCESS_KEY=""
    COMLINK_SECRET_KEY=""
  ```

You will need to register your own discord bot (for manual testing) and setup you own [swgoh comlink instance](https://github.com/swgoh-utils/swgoh-comlink). From those you can fill in the values missing above.

### Database Setup

The easiest way to set up a local PostgreSQL database is using Docker:

```bash
# Start all services (PostgreSQL + Bot)
docker compose up -d

# Initialize database with schema and test data
docker exec grakchawwaa-bot pnpm ts-node infra/setupDockerDB.ts

# Run migrations to update schema for MikroORM
docker exec grakchawwaa-bot pnpm migration:up
```

This will:
- Start a PostgreSQL container with pre-configured credentials
- Wait for the database to be ready
- Create all required tables with initial schema
- Run migrations to rename tables to camelCase for MikroORM
- Insert test data

**Docker Database Credentials:**
- Host: `localhost`
- Port: `5432`
- User: `grakchawwaa`
- Password: `dev_password`
- Database: `grakchawwaa_dev`

To use the Docker database in your `.env.dev` file:

```
PGUSER=grakchawwaa
PGHOST=localhost
PGPORT=5432
PGPASSWORD=dev_password
PGDATABASE=grakchawwaa_dev
```

**Docker Commands:**
- `docker compose up -d` - Start all services in background
- `docker compose logs -f bot` - Follow bot logs
- `docker compose restart bot` - Restart bot container
- `docker compose down` - Stop all services
- `docker compose down -v` - Stop and delete database volume

**Migration Commands:**
- `docker exec grakchawwaa-bot pnpm migration:create --name=description` - Create new migration
- `docker exec grakchawwaa-bot pnpm migration:up` - Run pending migrations
- `docker exec grakchawwaa-bot pnpm migration:down` - Rollback last migration

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
