# Stash

A self-hosted web tool for subscribing to YouTube channels and downloading videos with [yt-dlp](https://github.com/yt-dlp/yt-dlp), with automatic Docker builds for deployment on a NAS via Portainer.

## Features

- Subscribe to YouTube channels and manually fetch their newest videos
- Batch-download video+audio or audio-only, up to 4 in parallel
- Duplicate prevention via YouTube video ID
- Library view with search, filters (channel, status, tags, and multiple categories combined with OR), and sort
- Live download queue with progress bars (2–3s polling, no WebSockets)
- SponsorBlock integration (skips/removes sponsor segments via yt-dlp)
- Dark mode and German/English UI, both persisted server-side
- Database backup/export, yt-dlp version check + self-update
- Resumes interrupted downloads after a container restart

## Project layout

```
backend/    Express + TypeScript API, yt-dlp/ffmpeg orchestration, SQLite (better-sqlite3)
frontend/   React + Vite + TypeScript UI
```

## Local development

Requires Node.js 20+, and locally-installed `yt-dlp` and `ffmpeg`/`ffprobe` on your `PATH` (the Docker image installs these for you — see below).

```bash
npm install
npm run dev:backend   # starts the API on :3001
npm run dev:frontend  # starts the Vite dev server on :5173, proxying /api to :3001
```

Open http://localhost:5173. Backend data defaults to `backend/data/stash.db` and `backend/videos/` when `DB_PATH`/`VIDEOS_PATH` aren't set.

Build everything (type-check + compile) with:

```bash
npm run build
```

## Environment variables

| Variable        | Default                  | Description                              |
| --------------- | ------------------------- | ----------------------------------------- |
| `DB_PATH`        | `./data/stash.db`         | SQLite database file path                 |
| `VIDEOS_PATH`    | `./videos`                 | Root directory videos are downloaded into (organized as `<VIDEOS_PATH>/<channel>/...`) |
| `BACKEND_PORT`   | `3001`                     | Port the `/api/*` routes listen on        |
| `FRONTEND_PORT`  | `3000`                     | Port the built frontend is served on      |
| `YT_DLP_BIN`     | `yt-dlp`                   | Override the yt-dlp executable path       |
| `FFPROBE_BIN`    | `ffprobe`                  | Override the ffprobe executable path      |

## Docker / Portainer deployment

The image is built and pushed automatically by GitHub Actions on every push to `main` (see `.github/workflows/docker-build.yml`), and published to `ghcr.io/sk-r1/stash:latest`.

> **Adjust the paths to your NAS.** `/volume4/docker/stash/...` is only an example. On a Synology, replace `volume4` with the volume your Docker folder lives on (often `volume1`), and change the rest of the path if you keep it elsewhere. Update it both in the `mkdir` command below and in the `volumes:` section of `docker-compose.yml`. Only change the left (host) side of each mapping; the container paths `/app/data` and `/videos` must stay as they are.

On the NAS, create the data directories and deploy the stack:

```bash
mkdir -p /volume4/docker/stash/data /volume4/docker/stash/videos
```

Use `docker-compose.yml` as a Portainer stack (or `docker compose up -d` directly). It maps:

- `6070` → frontend (port `3000` in the container)
- `6071` → backend API (port `3001` in the container)
- `/volume4/docker/stash/data` → `/app/data` (SQLite DB)
- `/volume4/docker/stash/videos` → `/videos` (downloaded files)

Stash has no login. Keep it on your local network and don't expose the ports to the internet.

## Notes

- Channel checks are manual only — there is no background scheduler. Use "Fetch new videos" on a channel to look for new uploads.
- Removing a channel that still has videos only unsubscribes it; its videos stay in the library. Channels without videos are deleted.
- Cancelling a download marks it as `error` with an explanatory message (the schema has no separate "cancelled" status).

## Credits

Stash was created by Sönke Kastner with the help of [Claude](https://www.anthropic.com/claude) (Anthropic), using [Claude Code](https://claude.com/claude-code).

## License

[MIT](LICENSE) © 2026 Sönke Kastner
