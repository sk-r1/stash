import express from "express";
import cors from "cors";
import path from "node:path";
import { recoverStuckDownloads } from "./db";
import channelsRouter from "./routes/channels";
import videosRouter from "./routes/videos";
import downloadsRouter, { resumeQueuedDownloads } from "./routes/downloads";
import settingsRouter from "./routes/settings";

const BACKEND_PORT = Number(process.env.BACKEND_PORT) || 3001;
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT) || 3000;
const FRONTEND_DIST = path.join(__dirname, "..", "..", "frontend", "dist");
const VIDEOS_PATH = process.env.VIDEOS_PATH || path.join(__dirname, "..", "..", "videos");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/channels", channelsRouter);
app.use("/api/videos", videosRouter);
app.use("/api/downloads", downloadsRouter);
app.use("/api", settingsRouter);

// Serves downloaded files directly (range-request support built in) so a video
// can be played straight from the browser or opened as a network stream in VLC.
app.use("/media", express.static(VIDEOS_PATH));

app.use(express.static(FRONTEND_DIST));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, "index.html"));
});

recoverStuckDownloads();
resumeQueuedDownloads();

app.listen(BACKEND_PORT, () => {
  console.log(`Stash API listening on port ${BACKEND_PORT}`);
});

app.listen(FRONTEND_PORT, () => {
  console.log(`Stash frontend listening on port ${FRONTEND_PORT}`);
});
