import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_SETTINGS, Settings } from "./types";

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data", "stash.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    channel_id TEXT,
    description TEXT,
    thumbnail_url TEXT,
    audio_only INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    subscribed INTEGER NOT NULL DEFAULT 1
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_url ON channels(url);

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    youtube_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    thumbnail TEXT,
    resolution TEXT,
    audio_bitrate INTEGER,
    video_file_path TEXT,
    audio_only INTEGER NOT NULL DEFAULT 0,
    duration INTEGER,
    file_size INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    downloaded_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    queued INTEGER NOT NULL DEFAULT 0,
    tags TEXT
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_youtube_id ON videos(youtube_id);
  CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos(channel_id);
  CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name ON categories(name COLLATE NOCASE);

  CREATE TABLE IF NOT EXISTS video_categories (
    video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (video_id, category_id)
  );
`);

// CREATE TABLE IF NOT EXISTS is a no-op on a table that already exists, so a
// column added after the app was first deployed needs an explicit migration.
function hasColumn(table: string, column: string): boolean {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return columns.some((c) => c.name === column);
}

if (!hasColumn("channels", "subscribed")) {
  db.exec("ALTER TABLE channels ADD COLUMN subscribed INTEGER NOT NULL DEFAULT 1");
}
if (!hasColumn("videos", "tags")) {
  db.exec("ALTER TABLE videos ADD COLUMN tags TEXT");
}
if (!hasColumn("videos", "video_codec")) {
  db.exec("ALTER TABLE videos ADD COLUMN video_codec TEXT");
}
if (!hasColumn("videos", "audio_codec")) {
  db.exec("ALTER TABLE videos ADD COLUMN audio_codec TEXT");
}

// A channel can be reached via more than one valid URL (e.g. /channel/UC... vs
// /@handle), so matching purely by URL string (as the add-channel and
// single-video-add flows used to) can create a second row for a channel that
// already exists — same name, different id, silently splitting that
// uploader's videos across two "channels" that look identical in the UI.
// This merges any such duplicates by YouTube's own stable channel_id,
// keeping the subscribed row (or the oldest one) as the survivor. Safe to
// run on every boot: once merged, there's nothing left to find next time.
function mergeDuplicateChannels(): void {
  const duplicateGroups = db
    .prepare(
      `SELECT channel_id FROM channels
       WHERE channel_id IS NOT NULL
       GROUP BY channel_id
       HAVING COUNT(*) > 1`
    )
    .all() as { channel_id: string }[];

  const getGroupStmt = db.prepare(
    "SELECT * FROM channels WHERE channel_id = ? ORDER BY subscribed DESC, id ASC"
  );
  const reassignVideosStmt = db.prepare("UPDATE videos SET channel_id = ? WHERE channel_id = ?");
  const deleteChannelStmt = db.prepare("DELETE FROM channels WHERE id = ?");

  for (const { channel_id } of duplicateGroups) {
    const rows = getGroupStmt.all(channel_id) as { id: number }[];
    const [survivor, ...duplicates] = rows;
    for (const dup of duplicates) {
      reassignVideosStmt.run(survivor.id, dup.id);
      deleteChannelStmt.run(dup.id);
    }
  }
}

mergeDuplicateChannels();

/** Resets rows orphaned by an unclean shutdown so the queue can pick them back up. */
export function recoverStuckDownloads(): void {
  db.prepare(
    "UPDATE videos SET status = 'pending', error_message = NULL WHERE status = 'downloading'"
  ).run();
}

const getSettingStmt = db.prepare("SELECT value FROM settings WHERE key = ?");
const upsertSettingStmt = db.prepare(
  `INSERT INTO settings (key, value) VALUES (?, ?)
   ON CONFLICT(key) DO UPDATE SET value = excluded.value`
);

export function getSettings(): Settings {
  const result: Settings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const row = getSettingStmt.get(key) as { value: string } | undefined;
    if (row !== undefined) {
      try {
        (result as any)[key] = JSON.parse(row.value);
      } catch {
        // ignore malformed stored value, keep default
      }
    }
  }
  return result;
}

export function updateSettings(partial: Partial<Settings>): Settings {
  const setMany = db.transaction((entries: [string, unknown][]) => {
    for (const [key, value] of entries) {
      upsertSettingStmt.run(key, JSON.stringify(value));
    }
  });
  setMany(Object.entries(partial));
  return getSettings();
}

export function clampMaxParallel(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(4, Math.max(1, Math.round(value)));
}
