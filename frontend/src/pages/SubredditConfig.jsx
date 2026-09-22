import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api.js';
import SubredditList from '../components/SubredditList.jsx';

export default function SubredditConfig() {
  const [subs, setSubs] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setSubs(await api.subreddits());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = (subs ?? []).filter((s) => s.active).length;

  return (
    <div>
      <div className="page-head">
        <h1>Subreddits</h1>
        <span className="text-muted">{active} activos de {(subs ?? []).length}</span>
      </div>
      {error && <p className="error-text">{error}</p>}
      {subs && <SubredditList subreddits={subs} onChanged={load} />}
      <p className="hint">
        El monitor escanea <strong>≈50 posts por subreddit</strong> cada 6 horas. Las publicaciones se limitan a
        tu frecuencia diaria configurada en Ajustes.
      </p>
    </div>
  );
}