import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import PostCard from '../components/PostCard.jsx';

const PROMOTED = {
  name: 'CVMakerApp',
  url: 'https://cvmakerapp.vercel.app',
  github: 'https://github.com/TirsoCode/cvmakerapp',
  tagline: 'Generador de currículums profesionales en minutos',
  points: ['Gratis y sin registro', '20 plantillas premium', 'Exporta PDF A4 sin marca de agua', '100% en tu navegador'],
};

const STEPS = [
  { icon: '🔍', title: 'Detecta', text: 'Escanea tus subreddits cada 6h y encuentra posts donde tu producto aporta valor.' },
  { icon: '✍️', title: 'Redacta con IA', text: 'OpenRouter (modelo free) escribe respuestas naturales que mencionan tu web y tu código.' },
  { icon: '✅', title: 'Aprueba y publica', text: 'Tú decides siempre: revisa el borrador, edítalo y solo entonces se publica.' },
];

const fmt = (n) => (n == null ? '…' : Number(n).toLocaleString('es-ES', { maximumFractionDigits: 1 }));

export default function Dashboard() {
  const [drafts, setDrafts] = useState(null);
  const [approved, setApproved] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [d, a, s] = await Promise.all([api.drafts(), api.published(), api.stats()]);
      setDrafts(d);
      setApproved(a);
      setStats(s);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approvedCount = (approved ?? []).filter((p) => p.status === 'approved').length;
  const publishedCount = (approved ?? []).filter((p) => p.status === 'published').length;

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="hero">
        <span className="hero-kicker">🤖 Automatización con supervisión humana</span>
        <h1>
          Tu web, recomendada en Reddit <span className="accent">con voz humana</span>
        </h1>
        <p className="hero-sub">
          Monitorizamos subreddits donde tu producto encaja, la IA redacta respuestas
          naturales que mencionan tu web y tu código abierto, y tú apruebas antes de publicar nada.
        </p>
        <div className="hero-actions">
          <a href="#pendientes" className="btn btn-primary">Revisar borradores</a>
          <Link to="/subreddits" className="btn btn-secondary-cta">Configurar subreddits</Link>
        </div>
      </section>

      {/* ── Promoted product ─────────────────────────────── */}
      <section className="promo-card">
        <div className="promo-icon">📄</div>
        <div className="promo-body">
          <div className="promo-title">{PROMOTED.name} — {PROMOTED.tagline}</div>
          <p>Tu producto promocionado: la IA lo menciona de forma natural en cada borrador, junto con su código.</p>
          <div className="promo-badges">
            {PROMOTED.points.map((pt) => (
              <span key={pt} className="chip chip-sub" style={{ fontWeight: 600 }}>{pt}</span>
            ))}
          </div>
        </div>
        <div className="promo-links">
          <a className="btn btn-primary" href={PROMOTED.url} target="_blank" rel="noreferrer">Abrir web ↗</a>
          <a className="btn btn-outline" href={PROMOTED.github} target="_blank" rel="noreferrer">Ver código en GitHub ↗</a>
        </div>
      </section>

      {/* ── Steps ────────────────────────────────────────── */}
      <div className="steps">
        {STEPS.map((s, i) => (
          <div className="step" key={s.title}>
            <span className="step-num">{i + 1}</span>
            <h3>{s.icon} {s.title}</h3>
            <p>{s.text}</p>
          </div>
        ))}
      </div>

      {/* ── Quick stats ──────────────────────────────────── */}
      <div className="stat-row" style={{ marginTop: 20 }}>
        <div className="stat">
          <span className="stat-icon">📝</span>
          <strong>{drafts?.length ?? '…'}</strong>
          <span>Borradores pendientes</span>
        </div>
        <div className="stat">
          <span className="stat-icon">👌</span>
          <strong>{approvedCount}</strong>
          <span>Aprobados por publicar</span>
        </div>
        <div className="stat">
          <span className="stat-icon">🚀</span>
          <strong>{publishedCount}</strong>
          <span>Publicados</span>
        </div>
        <div className="stat">
          <span className="stat-icon">📈</span>
          <strong>{fmt(stats?.avg_engagement)}</strong>
          <span>Engagement medio</span>
        </div>
      </div>

      {error && <p className="error-text" style={{ marginTop: 16 }}>{error}</p>}

      {/* ── Drafts ───────────────────────────────────────── */}
      <div id="pendientes">
        <h2 className="section-title">
          Pendientes de revisión
          <span className="count">{drafts?.length ?? 0}</span>
        </h2>
        {drafts && drafts.length === 0 && (
          <div className="empty">
            <div className="empty-icon">🎉</div>
            <p>No hay borradores pendientes.</p>
            <p className="text-muted">El sistema escanea cada 6h y redacta con IA. Configura tu web y subreddits para empezar.</p>
          </div>
        )}
        <div className="post-grid">
          {drafts?.map((p) => (
            <PostCard key={p.id} post={p} onChanged={load} />
          ))}
        </div>
      </div>

      {/* ── Approved awaiting publish ────────────────────── */}
      <h2 className="section-title">
        Aprobados esperando publicación
        <span className="count">{approvedCount}</span>
      </h2>
      {approved && approvedCount === 0 && (
        <p className="text-muted">Nada aprobado por ahora. Cuando apruebes un borrador aparecerá aquí.</p>
      )}
      <div className="post-grid">
        {approved?.filter((p) => p.status === 'approved').map((p) => (
          <PostCard key={p.id} post={p} onChanged={load} />
        ))}
      </div>
    </div>
  );
}