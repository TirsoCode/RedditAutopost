import StatsBadge from './StatsBadge.jsx';
import { api } from '../services/api.js';
import { useState } from 'react';
import ApprovalModal from './ApprovalModal.jsx';

const RISK_LABELS = { bajo: 'Bajo', medio: 'Medio', alto: 'Alto' };

export default function PostCard({ post, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [published, setPublished] = useState(null);

  async function act(fn) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish() {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.publish(post.id);
      if (updated?.published_url) setPublished(updated.published_url);
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const isPublished = published || (post.status === 'published' && post.published_url);

  return (
    <article className="card post-card">
      <div className="post-card-head">
        <span className="chip chip-sub">r/{post.subreddit_name}</span>
        {post.spam_risk && (
          <span className={`chip chip-spam-${post.spam_risk}`}>
            Spam: {RISK_LABELS[post.spam_risk] ?? post.spam_risk} {post.spam_risk === 'bajo' ? '✅' : ''}
          </span>
        )}
        <span className="chip chip-status">{post.status}</span>
        {post.relevance_reason && <span className="chip chip-reason" title={post.relevance_reason}>Relevante</span>}
      </div>

      <div className="post-card-original">
        <a href={post.original_post_url} target="_blank" rel="noreferrer" className="post-original-title">
          {post.original_post_title || '(sin título)'}
        </a>
        {post.original_post_body && <p className="post-original-body">{post.original_post_body.slice(0, 280)}…</p>}
      </div>

      {post.drafted_content ? (
        <div className="post-card-draft">
          <div className="section-label">Borrador redactado por IA</div>
          <p className="draft-text">{post.drafted_content}</p>
        </div>
      ) : (
        <p className="text-muted">Aún sin borrador (pendiente de redacción IA).</p>
      )}

      {post.spam_suggestion && post.spam_risk === 'medio' && (
        <p className="suggestion">💡 {post.spam_suggestion}</p>
      )}

      {isPublished ? (
        <div className="post-actions">
          <a href={isPublished} target="_blank" rel="noreferrer" className="btn btn-primary">Ver en Reddit ↗</a>
          {post.upvotes > 0 && <StatsBadge upvotes={post.upvotes} comments={post.comments} />}
        </div>
      ) : (
        <div className="post-actions">
          {post.status === 'draft' && (
            <>
              <button className="btn btn-primary" disabled={busy} onClick={() => act(() => api.approve(post.id))}>
                Aprobar
              </button>
              <button className="btn btn-outline" disabled={busy} onClick={() => setModalOpen(true)}>
                Editar
              </button>
            </>
          )}
          {post.status === 'approved' && (
            <button className="btn btn-primary" disabled={busy} onClick={handlePublish}>
              Publicar en Reddit
            </button>
          )}
          {(post.status === 'draft' || post.status === 'approved') && (
            <button className="btn btn-danger" disabled={busy} onClick={() => act(() => api.reject(post.id))}>
              Rechazar
            </button>
          )}
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      {modalOpen && (
        <ApprovalModal
          post={post}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); onChanged?.(); }}
        />
      )}
    </article>
  );
}