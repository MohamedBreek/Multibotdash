# Multibot Dashboard (cleaned)

This repository is a cleaned copy of the original Multibot dashboard. All sensitive values (database URIs, client secrets, tokens) were removed and replaced with environment variable usage and placeholders.

## Quick start

1. Copy `.env.example` to `.env` and fill in the values.

2. Install dependencies:

```bash
npm install
```

3. Run the server:

```bash
npm start
```

The server default port is `3001` (use `PORT` in `.env` to change).

## Environment variables

Populate `.env` (or your hosting provider settings) with these variables. See `.env.example` for a reference.

- `PORT` - port to run the server on (default 3001)
- `BASE_URL` - base URL used for OAuth redirects (e.g. `http://localhost:3001`)
- `MONGODB_URI` - MongoDB connection string
- `DISCORD_CLIENT_ID` - Discord OAuth application client id
- `DISCORD_CLIENT_SECRET` - Discord OAuth application client secret
- `BOT_TOKEN` - (optional) Discord bot token
- `BOT_NOTIFY_TOKEN` - (optional) shared secret used for internal notifications

Important: never commit real secrets to the repository. Keep `.env` out of version control (already included in `.gitignore`).

## Development

- Run in development mode with auto-reload (requires nodemon):

```bash
npm run dev
```

## Security notes

- If you previously used this repository with real credentials, assume those credentials are compromised and rotate them immediately.
- This cleaned repository has a new git history that does not contain the original `.git` from the upstream clone; however, secrets pushed to any previous remote are not removed by this action.

## License

MIT
