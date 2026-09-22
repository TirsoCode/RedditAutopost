import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { connectReddit, disconnectReddit } from '../services/auth.js';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ web_url: '', post_frequency: 2, spam_threshold: 'medio' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await api.settings();
      setSettings(s);
      setForm({ web_url: s.web_url || '', post_frequency: s.post_frequency, spam_threshold: s.spam_threshold });
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get('reddit') === 'connected') {
      params.delete('reddit');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [load]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateSettings(form);
      setSaved(true);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Configuración</h1>
      </div>

      {error && <p className="error-text">{error}</p>}
      {saved && <p className="success-text">Cambios guardados</p>}

      <div className="card">
        <h2 className="section-title">Conexión con Reddit</h2>
        {settings?.reddit_connected ? (
          <div className="row-between">
            <span>Conectado como <strong>u/{settings.reddit_username}</strong></span>
            <button className="btn btn-danger" onClick={() => disconnectReddit().then(load)}>Desconectar</button>
          </div>
        ) : (
          <div className="row-between">
            <span className="text-muted">
              Conecta tu cuenta para escanear subreddits y publicar por ti.
              <Link className="link" to="/subreddits"> Ver subreddits configurados</Link>
            </span>
            <button className="btn btn-primary" onClick={connectReddit}>Conectar Reddit</button>
          </div>
        )}
      </div>

      <form className="card" onSubmit={save}>
        <h2 className="section-title">Tu web (contexto para la IA)</h2>

        <div className="promo-badges" style={{ marginBottom: 14 }}>
          <span className="chip chip-sub" style={{ fontWeight: 700 }}>Promocionando CVMakerApp (tu web real)</span>
          <a className="chip chip-reason" href="https://github.com/TirsoCode/cvmakerapp" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            Código en GitHub
          </a>
        </div>

        <label className="field">
          <span>Web URL</span>
          <input
            type="url"
            value={form.web_url}
            onChange={(e) => setForm({ ...form, web_url: e.target.value })}
            placeholder="https://cvmakerapp.vercel.app"
            required
          />
          <small className="text-muted">
            Es la "identidad" del bot: qué ofreces. La IA la usa para redactar, decidir relevancia y mencionar la web de forma
            natural en cada respuesta (junto a tu repo de GitHub configurado en el backend).
          </small>
        </label>

        <div className="fields-row">
          <label className="field">
            <span>Frecuencia de posts</span>
            <select
              value={form.post_frequency}
              onChange={(e) => setForm({ ...form, post_frequency: Number(e.target.value) })}
            >
              <option value={1}>1 post/día</option>
              <option value={2}>2 posts/día</option>
              <option value={3}>3 posts/día</option>
            </select>
          </label>
          <label className="field">
            <span>Umbral de spam</span>
            <select
              value={form.spam_threshold}
              onChange={(e) => setForm({ ...form, spam_threshold: e.target.value })}
            >
              <option value="bajo">Conservador (solo spam bajo)</option>
              <option value="medio">Normal (bajo + medio)</option>
              <option value="alto">Permisivo (todo)</option>
            </select>
          </label>
        </div>

        <button className="btn btn-primary" disabled={busy}>Guardar cambios</button>
      </form>
    </div>
  );
}