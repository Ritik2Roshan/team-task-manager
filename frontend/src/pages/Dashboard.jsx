import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

function StatCard({ label, value, accent }) {
  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm ${accent || ''}`}
    >
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/dashboard');
        if (!cancelled) setStats(data);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-center text-slate-400">Loading dashboard…</div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-xl bg-rose-500/10 px-4 py-3 text-rose-300 ring-1 ring-rose-500/30">
          {error}
        </div>
      </div>
    );
  }

  const recent = stats?.recent_projects || [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      <p className="mt-1 text-slate-400">
        Task metrics for projects you can access, plus your projects.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="My projects" value={stats?.projects_count ?? 0} accent="ring-1 ring-violet-500/20" />
        <StatCard label="Total tasks" value={stats?.total_tasks ?? 0} />
        <StatCard label="Completed" value={stats?.completed ?? 0} accent="ring-1 ring-emerald-500/20" />
        <StatCard label="In progress" value={stats?.in_progress ?? 0} />
        <StatCard label="Overdue" value={stats?.overdue ?? 0} accent="ring-1 ring-rose-500/20" />
        <StatCard label="Assigned to me" value={stats?.assigned_to_me ?? 0} accent="ring-1 ring-indigo-500/20" />
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">Recent projects</h2>
        <Link
          to="/projects"
          className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
        >
          View all →
        </Link>
      </div>
      {recent.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-6 text-center text-slate-500">
          No projects yet.{' '}
          <Link to="/projects" className="text-indigo-400 hover:text-indigo-300">
            Create one
          </Link>
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {recent.map((p) => (
            <li key={p.id}>
              <Link
                to={`/projects/${p.id}`}
                className="block rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-indigo-500/40 hover:bg-slate-900"
              >
                <span className="font-medium text-white">{p.name}</span>
                {p.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">{p.description}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/tasks"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          All tasks
        </Link>
        <Link
          to="/projects"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Projects
        </Link>
      </div>
    </div>
  );
}
