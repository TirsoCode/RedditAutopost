import { useState } from 'react';
import { api } from '../services/api.js';

/** Modal para revisar/editar el borrador antes de aprobar. */
export default function ApprovalModal({ post, onClose, onSaved }) {
  const [content, setContent] = useState(post.drafted_content || '');
  const [title, setTitle] = useState(post.title_override || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api.edit(post.id, { content, title: title || null });
      onSaved?.();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Editar borrador</h3>
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        </div>

        <div className="modal-original">
          <strong>Original:</strong> {post.original_post_title}
          <div className="text-muted">r/{post.subreddit_name}</div>
        </div>

        <label className="field">
          <span>Título (opcional, solo para posts nuevos)</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Deja vacío para usar el del post original" />
        </label>

        <label className="field">
          <span>Contenido</span>
          <textarea rows={10} value={content} onChange={(e) => setContent(e.target.value)} />
        </label>

        {error && <p className="error-text">{error}</p>}

        <div className="modal-actions">
          <button className="btn btn-primary" disabled={busy} onClick={save}>Guardar</button>
          <button className="btn btn-outline" disabled={busy} onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}