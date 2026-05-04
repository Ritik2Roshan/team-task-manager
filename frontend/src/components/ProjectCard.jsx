import { Link } from 'react-router-dom';

export default function ProjectCard({ project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="block rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm transition hover:border-indigo-500/50 hover:bg-slate-900"
    >
      <h3 className="text-lg font-semibold text-white">{project.name}</h3>
      <p className="mt-2 line-clamp-2 text-sm text-slate-400">{project.description}</p>
      <p className="mt-3 text-xs text-slate-500">Owner: {project.owner_name || '—'}</p>
    </Link>
  );
}
