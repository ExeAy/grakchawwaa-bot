# grakchawwaa-bot

Code for the Grakchawwaa discord applicaton

## Local development

### Postgres

Setup local postgres according to [Heroku docs](https://devcenter.heroku.com/articles/local-setup-heroku-postgres). Start the local DB with `psql -h localhost`.

CREATE TABLE users (DiscordId UUID PRIMARY KEY, MainAllyCode CHAR(9), AltAllyCodes CHAR(9)[])
