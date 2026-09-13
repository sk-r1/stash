import { Router } from "express";
import { db } from "../db";

const router = Router();

const listStmt = db.prepare("SELECT * FROM categories ORDER BY name COLLATE NOCASE");
const getStmt = db.prepare("SELECT * FROM categories WHERE id = ?");
const insertStmt = db.prepare("INSERT INTO categories (name) VALUES (?)");
const renameStmt = db.prepare("UPDATE categories SET name = ? WHERE id = ?");
const deleteStmt = db.prepare("DELETE FROM categories WHERE id = ?");

router.get("/", (_req, res) => {
  res.json(listStmt.all());
});

router.post("/", (req, res) => {
  const name = (req.body as { name?: string }).name?.trim();
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  try {
    const info = insertStmt.run(name);
    res.status(201).json(getStmt.get(info.lastInsertRowid));
  } catch (err) {
    if ((err as any).code === "SQLITE_CONSTRAINT_UNIQUE") {
      res.status(409).json({ error: "Category already exists" });
      return;
    }
    throw err;
  }
});

router.put("/:id", (req, res) => {
  const category = getStmt.get(req.params.id);
  if (!category) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  const name = (req.body as { name?: string }).name?.trim();
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  try {
    renameStmt.run(name, req.params.id);
  } catch (err) {
    if ((err as any).code === "SQLITE_CONSTRAINT_UNIQUE") {
      res.status(409).json({ error: "Category already exists" });
      return;
    }
    throw err;
  }
  res.json(getStmt.get(req.params.id));
});

router.delete("/:id", (req, res) => {
  deleteStmt.run(req.params.id);
  res.status(204).end();
});

export default router;
