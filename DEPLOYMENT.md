# Deployment Guide

## Pre-Deployment Checklist

Before deploying to Heroku, ensure:

- [ ] All environment variables are set in Heroku
- [ ] Database is set up and migrations are run
- [ ] Code is built (`pnpm build`)

## Post-Deployment Steps

### 1. Scale Web Dyno to 0 (REQUIRED)

This bot runs only as a worker dyno. Web dynos require HTTP health checks, which this bot doesn't provide.

```bash
heroku ps:scale web=0 --app grakchawwaa
```

Or use the npm script:
```bash
pnpm heroku-scale-web-zero
```

### 2. Verify Dyno Configuration

Check that only the worker dyno is running:

```bash
heroku ps --app grakchawwaa
```

Or use the npm script:
```bash
pnpm heroku-check-dynos
```

Expected output:
```
=== Dynos ===
worker.1: up (or starting)
```

**If you see `web.1` in the output, scale it to 0 immediately.**

### 3. Check Logs

Monitor the worker dyno logs to ensure it's running correctly:

```bash
heroku logs --tail --app grakchawwaa --dyno=worker.1
```

Or use the npm script:
```bash
pnpm see-heroku-log
```

## Troubleshooting

### Web Dyno Keeps Starting

If the web dyno keeps starting after you scale it to 0:

1. Check if you have any Heroku addons or features that require a web dyno
2. Verify your `Procfile` only defines `worker: npm start`
3. Check Heroku app settings for any auto-scaling configurations

### Bot Not Responding

1. Check worker dyno logs: `heroku logs --tail --app grakchawwaa --dyno=worker.1`
2. Verify environment variables are set: `heroku config --app grakchawwaa`
3. Check if worker dyno is running: `heroku ps --app grakchawwaa`

### Health Check Failures

If you see health check failures, it means a web dyno is trying to run. Scale it to 0:

```bash
heroku ps:scale web=0 --app grakchawwaa
```

## Quick Reference

```bash
# Scale web to 0 (required after deployment)
heroku ps:scale web=0 --app grakchawwaa

# Check dyno status
heroku ps --app grakchawwaa

# View worker logs
heroku logs --tail --app grakchawwaa --dyno=worker.1

# Restart worker dyno
heroku restart worker --app grakchawwaa
```

