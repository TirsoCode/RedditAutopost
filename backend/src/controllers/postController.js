import { listPosts, getPost, setStatus } from '../models/Post.js';
import { query } from '../config/db.js';

export async function getDrafts(req, res) {
  const posts = await listPosts(req.userId, { status: 'draft', limit: 200 });
  res.json(posts);
}

export async function getPublished(req, res) {
  const posts = await listPosts(req.userId, { status: 'published', limit: 200 });
  res.json(posts);
}

export async function getOne(req, res) {
  const post = await getPost(req.userId, req.params.id);
  if (!post) return res.status(404).json({ error: 'Post no encontrado' });
  res.json(post);
}

/** Aprobar un borrador: status draft -> approved. */
export async function approve(req, res) {
  const post = await getPost(req.userId, req.params.id);
  if (!post) return res.status(404).json({ error: 'Post no encontrado' });
  if (post.status !== 'draft') {
    return res.status(400).json({ error: `Solo se pueden aprobar borradores (estado actual: ${post.status})` });
  }
  const updated = await setStatus(post.id, 'approved');
  res.json(updated);
}

/** Editar el contenido redactado antes de aprobar. */
export async function edit(req, res) {
  const { content, title } = req.body || {};
  const post = await getPost(req.userId, req.params.id);
  if (!post) return res.status(404).json({ error: 'Post no encontrado' });
  if (post.status !== 'draft' && post.status !== 'candidate') {
    return res.status(400).json({ error: `Ya no se puede editar (estado: ${post.status})` });
  }
  const { rows } = await query(
    `UPDATE posts SET drafted_content = COALESCE($2, drafted_content),
            title_override = COALESCE($3, title_override), updated_at = now()
     WHERE id = $1 RETURNING *`,
    [post.id, content ?? null, title ?? null]
  );
  res.json(rows[0]);
}

export async function reject(req, res) {
  const post = await getPost(req.userId, req.params.id);
  if (!post) return res.status(404).json({ error: 'Post no encontrado' });
  const updated = await setStatus(post.id, 'rejected');
  res.json(updated);
}