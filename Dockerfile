# --- frontend build ---
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- backend build ---
FROM node:20-alpine AS backend-build
RUN apk add --no-cache python3 make g++
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npm run build

# --- final runtime image ---
FROM node:20-alpine AS final
RUN apk add --no-cache ffmpeg python3 py3-pip curl \
    && pip install --no-cache-dir --break-system-packages yt-dlp

# yt-dlp needs a JS runtime to solve YouTube's signature/nsig challenges for
# some formats; without one, extraction can fail or hang for those videos.
COPY --from=denoland/deno:bin /deno /usr/local/bin/deno

WORKDIR /app
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build /app/backend/package.json ./backend/package.json
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

RUN mkdir -p /app/data /videos

ENV NODE_ENV=production
ENV DB_PATH=/app/data/stash.db
ENV VIDEOS_PATH=/videos
ENV FRONTEND_PORT=3000
ENV BACKEND_PORT=3001

EXPOSE 3000 3001

WORKDIR /app/backend
CMD ["node", "dist/server.js"]
