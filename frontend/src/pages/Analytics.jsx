import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api.js';

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setStats(await api.stats());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('es-ES', { maximumFractionDigits: 1 }));

  return (
    <div>
      <div className="page-head">
        <h1>Analytics</h1>
      </div>
      {error && <p className="error-text">{error}</p>}

      {stats && (
        <div className="kpi-grid">
          <div className="kpi"><span>Total publicados</span><strong>{fmt(stats.published)}</strong></div>
          <div className="kpi"><span>Promedio upvotes</span><strong>{fmt(stats.avg_upvotes)}</strong></div>
          <div className="kpi"><span>Promedio comentarios</span><strong>{fmt(stats.avg_comments)}</strong></div>
          <div className="kpi"><span>Engagement medio</span><strong>{fmt(stats.avg_engagement)}</strong></div>
          <div className="kpi"><span>Borradores pendientes</span><strong>{fmt(stats.pending_drafts)}</strong></div>
        </div>
      )}

      <h2 className="section-title">Top subreddits</h2>
      {stats?.topSubreddits?.length ? (
        <table className="table">
          <thead>
            <tr><th>Subreddit</th><th>Posts</th><th>Avg upvotes</th><th>Avg comentarios</th><th>Engagement</th></tr>
          </thead>
          <tbody>
            {stats.topSubreddits.map((s) => (
              <tr key={s.subreddit_name}>
                <td>r/{s.subreddit_name}</td>
                <td>{s.n}</td>
                <td>{fmt(s.avg_upvotes)}</td>
                <td>{fmt(s.avg_comments)}</td>
                <td>{fmt(s.avg_engagement)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-muted">Aún no hay datos. Los stats se recogen cada hora tras publicar.</p>
      )}

      <h2 className="section-title">Engagement últimos 7 días</h2>
      {stats?.history?.length ? (
        <div className="bars">
          {stats.history.map((h) => (
            <div key={h.day} className="bar-col" title={`${h.day}: ${fmt(h.engagement)}`}>
              <div className="bar" style={{ height: `${Math.max(6, Math.min(100, Number(h.engagement) * 10))}%` }} />
              <span className="bar-label">{new Date(h.day).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted">Sin datos todavía.</p>
      )}
    </div>
  );
}