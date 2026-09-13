import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { db, getSettings, updateSettings, clampMaxParallel } from "../db";
import { getVersion, selfUpdate } from "../yt-dlp";

const router = Router();

router.get("/settings", (_req, res) => {
  res.json(getSettings());
});

router.put("/settings", (req, res) => {
  const body = req.body as Record<string, unknown>;
  if (typeof body.max_parallel_downloads === "number") {
    body.max_parallel_downloads = clampMaxParallel(body.max_parallel_downloads);
  }
  res.json(updateSettings(body));
});

router.post("/yt-dlp/check-update", async (_req, res) => {
  try {
    const version = await getVersion();
    updateSettings({ yt_dlp_version: version });
    res.json({ version });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

router.post("/yt-dlp/update", async (_req, res) => {
  try {
    const version = await selfUpdate();
    updateSettings({ yt_dlp_version: version });
    res.json({ version });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

router.post("/database/backup", (_req, res) => {
  const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "..", "data", "stash.db");
  const backupDir = path.join(path.dirname(dbPath), "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `stash-${timestamp}.db`);

  db.backup(backupPath)
    .then(() => {
      res.download(backupPath, path.basename(backupPath));
    })
    .catch((err: Error) => {
      res.status(500).json({ error: err.message });
    });
});

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default router;
