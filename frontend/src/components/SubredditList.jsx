import { useState } from 'react';
import { api } from '../services/api.js';

export default function SubredditList({ subreddits, onChanged }) {
  const [newSub, setNewSub] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function add(e) {
    e.preventDefault();
    if (!newSub.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.addSubreddit(newSub);
      setNewSub('');
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(sub) {
    setError(null);
    try {
      await api.toggleSubreddit(sub.subreddit_name, !sub.active);
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  async function remove(sub) {
    if (!window.confirm(`¿Eliminar r/${sub.subreddit_name}?`)) return;
    setError(null);
    try {
      await api.removeSubreddit(sub.subreddit_name);
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="subreddit-list">
      <form className="sub-add" onSubmit={add}>
        <input
          value={newSub}
          onChange={(e) => setNewSub(e.target.value)}
          placeholder="nombre del subreddit (ej. python)"
        />
        <button className="btn btn-primary" disabled={busy}>Añadir</button>
      </form>

      <ul className="sub-items">
        {subreddits.map((sub) => (
          <li key={sub.id} className={`sub-item ${sub.active ? '' : 'dimmed'}`}>
            <span className="sub-name">r/{sub.subreddit_name}</span>
            <div className="sub-actions">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={sub.active}
                  onChange={() => toggle(sub)}
                />
                <span className="slider"></span>
              </label>
              <button className="btn btn-ghost btn-sm" onClick={() => remove(sub)}>✕</button>
            </div>
          </li>
        ))}
      </ul>

      {!subreddits.length && <p className="text-muted">Aún no hay subreddits. Añade el primero 👆</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}