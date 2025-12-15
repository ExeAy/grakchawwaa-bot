import { Migration } from '@mikro-orm/migrations';

export class Migration20251215200000 extends Migration {

  override async up(): Promise<void> {
    // Rename tables to camelCase (preserving data)
    this.addSql(`alter table if exists "guildmessagechannels" rename to "guildMessageChannels";`);
    this.addSql(`alter table if exists "ticketviolations" rename to "ticketViolations";`);

    // Update players table columns
    this.addSql(`alter table "players" alter column "discord_id" type varchar(255) using ("discord_id"::varchar(255));`);
    this.addSql(`alter table "players" alter column "ally_code" type varchar(9) using ("ally_code"::varchar(9));`);
    this.addSql(`alter table "players" alter column "alt_ally_codes" type text[] using ("alt_ally_codes"::text[]);`);
    this.addSql(`alter table "players" alter column "alt_ally_codes" set default '{}';`);
    this.addSql(`alter table "players" alter column "alt_ally_codes" set not null;`);
    this.addSql(`alter table "players" alter column "registered_at" drop default;`);
    this.addSql(`alter table "players" alter column "registered_at" type timestamptz using ("registered_at"::timestamptz);`);
  }

  override async down(): Promise<void> {
    // Rename tables back to lowercase
    this.addSql(`alter table if exists "guildMessageChannels" rename to "guildmessagechannels";`);
    this.addSql(`alter table if exists "ticketViolations" rename to "ticketviolations";`);

    // Revert players table columns
    this.addSql(`alter table "players" alter column "discord_id" type text using ("discord_id"::text);`);
    this.addSql(`alter table "players" alter column "ally_code" type char(9) using ("ally_code"::char(9));`);
    this.addSql(`alter table "players" alter column "alt_ally_codes" drop default;`);
    this.addSql(`alter table "players" alter column "alt_ally_codes" type bpchar[] using ("alt_ally_codes"::bpchar[]);`);
    this.addSql(`alter table "players" alter column "alt_ally_codes" drop not null;`);
    this.addSql(`alter table "players" alter column "registered_at" type timestamp(6) using ("registered_at"::timestamp(6));`);
    this.addSql(`alter table "players" alter column "registered_at" set default CURRENT_TIMESTAMP;`);
  }

}
