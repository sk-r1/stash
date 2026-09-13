import { Router } from "express";
import fs from "node:fs";
import { db } from "../db";
import { VideoRow } from "../types";

const router = Router();

const getVideoStmt = db.prepare("SELECT * FROM videos WHERE id = ?");
const deleteVideoStmt = db.prepare("DELETE FROM videos WHERE id = ?");

const SORT_COLUMNS: Record<string, string> = {
  date: "v.created_at",
  name: "v.title",
  channel: "c.name",
};

router.get("/", (req, res) => {
  const { status, channel_id, search, sort } = req.query as Record<string, string | undefined>;

  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  if (status) {
    clauses.push("v.status = @status");
    params.status = status;
  }
  if (channel_id) {
    clauses.push("v.channel_id = @channel_id");
    params.channel_id = channel_id;
  }
  if (search) {
    clauses.push("v.title LIKE @search");
    params.search = `%${search}%`;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const sortColumn = SORT_COLUMNS[sort || "date"] || SORT_COLUMNS.date;

  const rows = db
    .prepare(
      `SELECT v.*, c.name as channel_name FROM videos v
       JOIN channels c ON c.id = v.channel_id
       ${where}
       ORDER BY ${sortColumn} DESC`
    )
    .all(params);

  res.json(rows);
});

router.delete("/:id", (req, res) => {
  const video = getVideoStmt.get(req.params.id) as VideoRow | undefined;
  if (!video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }
  if (video.video_file_path && fs.existsSync(video.video_file_path)) {
    fs.unlinkSync(video.video_file_path);
  }
  deleteVideoStmt.run(video.id);
  res.status(204).end();
});

export default router;
