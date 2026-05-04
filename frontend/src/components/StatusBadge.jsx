const styles = {
  todo: 'bg-slate-700 text-slate-200',
  in_progress: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40',
  completed: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40',
};

const labels = {
  todo: 'To do',
  in_progress: 'In progress',
  completed: 'Done',
};

export default function StatusBadge({ status }) {
  const cls = styles[status] || styles.todo;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {labels[status] || status}
    </span>
  );
}
