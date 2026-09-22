import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api.js';
import PostCard from '../components/PostCard.jsx';

export default function ApprovedPosts() {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setPosts(await api.published());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const published = (posts ?? []).filter((p) => p.status === 'published');

  return (
    <div>
      <div className="page-head">
        <h1>Posts publicados</h1>
        <span className="text-muted">{published.length} en total</span>
      </div>
      {error && <p className="error-text">{error}</p>}
      {posts && published.length === 0 && <p className="text-muted">Aún no has publicado nada.</p>}
      <div className="post-grid">
        {published.map((p) => (
          <PostCard key={p.id} post={p} onChanged={load} />
        ))}
      </div>
    </div>
  );
}