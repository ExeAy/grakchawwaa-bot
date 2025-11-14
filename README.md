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

The bot is built using TypeScript and the Sapphire Discord.js framework.

### Prerequisites

- Node.js (v16 or higher)
- PNPM package manager
- PostgreSQL database

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

You will need to setup your own Postgres database (for development), register your own discord bot (for manual testing) and setup you own [swgoh comlink instance](https://github.com/swgoh-utils/swgoh-comlink). From those you can fille in the values missing above.

### Database

The bot uses PostgreSQL for data storage. Database tables are created with:

```bash
npx ts-node infra/setupLocalDB.ts
```
