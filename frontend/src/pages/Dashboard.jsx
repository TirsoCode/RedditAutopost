import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api.js';
import PostCard from '../components/PostCard.jsx';

export default function Dashboard() {
  const [drafts, setDrafts] = useState(null);
  const [approved, setApproved] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [d, a] = await Promise.all([api.drafts(), api.published()]);
      setDrafts(d);
      setApproved(a);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-head">
        <h1>Dashboard</h1>
        <div className="stat-row">
          <div className="stat"><strong>{drafts?.length ?? '…'}</strong><span>Borradores</span></div>
          <div className="stat"><strong>{approved?.length ?? '…'}</strong><span>Aprobados</span></div>
          <div className="stat"><strong>{approved?.filter((p) => p.status === 'published').length ?? '…'}</strong><span>Publicados</span></div>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <h2 className="section-title">Pendientes de revisión</h2>
      {drafts && drafts.length === 0 && (
        <div className="empty">
          <p>No hay borradores pendientes. El sistema escanea cada 6h y redacta con IA.</p>
          <p className="text-muted">Asegúrate de configurar tu web y subreddits en Ajustes/Subreddits.</p>
        </div>
      )}
      <div className="post-grid">
        {drafts?.map((p) => (
          <PostCard key={p.id} post={p} onChanged={load} />
        ))}
      </div>

      <h2 className="section-title">Aprobados esperando publicación</h2>
      {approved?.filter((p) => p.status === 'approved').length === 0 && (
        <p className="text-muted">Nada aprobado por ahora.</p>
      )}
      <div className="post-grid">
        {approved?.filter((p) => p.status === 'approved').map((p) => (
          <PostCard key={p.id} post={p} onChanged={load} />
        ))}
      </div>
    </div>
  );
}