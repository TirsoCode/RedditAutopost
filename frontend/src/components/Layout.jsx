import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/approved', label: 'Publicados' },
  { to: '/subreddits', label: 'Subreddits' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/settings', label: 'Ajustes' },
];

const PROMOTED = {
  name: 'CVMakerApp',
  url: 'https://cvmakerapp.vercel.app',
};

export default function Layout() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <NavLink to="/" className="logo">
            Reddit<span>Auto</span>Post
          </NavLink>
          <nav>
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <a className="topbar-promo" href={PROMOTED.url} target="_blank" rel="noreferrer" title={PROMOTED.url}>
          Promocionando {PROMOTED.name}
        </a>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}