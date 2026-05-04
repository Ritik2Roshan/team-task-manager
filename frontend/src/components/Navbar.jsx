import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
  }`;

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link to="/dashboard" className="text-lg font-bold tracking-tight text-white">
          Team<span className="text-indigo-400">Tasks</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-2">
          <NavLink to="/dashboard" className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/projects" className={linkClass}>
            Projects
          </NavLink>
          <NavLink to="/tasks" className={linkClass}>
            Tasks
          </NavLink>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-400">
            {user?.name}{' '}
            <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-indigo-300">
              {user?.role}
            </span>
            <span className="ml-2 hidden text-xs text-slate-500 sm:inline">ID {user?.id}</span>
          </span>
          {isAdmin && (
            <span className="hidden text-xs text-amber-400 sm:inline">Admin</span>
          )}
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200 hover:bg-slate-800"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
