export const CREATE_TABLES_QUERY = `
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
`

