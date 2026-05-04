import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading…
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <span className="text-xl font-bold tracking-tight">
          Team<span className="text-indigo-400">Tasks</span>
        </span>
        <div className="flex gap-2">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500"
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-12 text-center md:pt-20">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Stay focused, stay moving.
        </h1>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link
            to="/signup"
            className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold shadow-lg shadow-indigo-900/40 hover:bg-indigo-500"
          >
            Get started
          </Link>
          <Link
            to="/login"
            className="rounded-xl border border-slate-600 px-8 py-3 text-sm font-semibold hover:bg-slate-800/80"
          >
            Log in
          </Link>
        </div>
      </main>
    </div>
  );
}
