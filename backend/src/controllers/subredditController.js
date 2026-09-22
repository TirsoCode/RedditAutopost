import { listSubreddits, addSubreddit, setActive, removeSubreddit } from '../models/Subreddit.js';

export async function getAll(req, res) {
  res.json(await listSubreddits(req.userId));
}

export async function add(req, res) {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Falta el nombre del subreddit' });
  }
  try {
    const sub = await addSubreddit(req.userId, name);
    res.status(201).json(sub);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo agregar el subreddit' });
  }
}

export async function toggle(req, res) {
  const { active } = req.body || {};
  const sub = await setActive(req.userId, req.params.name, Boolean(active));
  if (!sub) return res.status(404).json({ error: 'Subreddit no encontrado' });
  res.json(sub);
}

export async function remove(req, res) {
  await removeSubreddit(req.userId, req.params.name);
  res.status(204).end();
}