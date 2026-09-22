import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ApprovedPosts from './pages/ApprovedPosts.jsx';
import SubredditConfig from './pages/SubredditConfig.jsx';
import Analytics from './pages/Analytics.jsx';
import Settings from './pages/Settings.jsx';
import { bootstrap } from './services/api.js';

export default function App() {
  const [ready, setReady] = useState(false);
  const [sessionOk, setSessionOk] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await bootstrap();
        setSessionOk(true);
      } catch (err) {
        console.error('Bootstrap failed', err);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) {
    return (
      <div className="boot-screen">
        <div className="logo pulse">Reddit<span>Auto</span>Post</div>
        <p>Conectando…</p>
      </div>
    );
  }

  if (!sessionOk) {
    return (
      <div className="boot-screen">
        <div className="logo">Reddit<span>Auto</span>Post</div>
        <p className="text-muted">No se pudo conectar con el backend. ¿Está corriendo en :4000?</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/approved" element={<ApprovedPosts />} />
        <Route path="/subreddits" element={<SubredditConfig />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}