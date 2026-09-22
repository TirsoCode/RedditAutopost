import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/approved', label: 'Publicados' },
  { to: '/subreddits', label: 'Subreddits' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/settings', label: 'Ajustes' },
];

export default function Layout() {
  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/" className="logo">Reddit<span>Auto</span>Post</NavLink>
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
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}