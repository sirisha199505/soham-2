export default function Table({ columns, data, loading, emptyText = 'No data found' }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 grid gap-4" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
          {columns.map((_, i) => <div key={i} className="skeleton h-4 rounded" />)}
        </div>
        {[1,2,3,4].map(i => (
          <div key={i} className="px-4 py-3.5 border-t border-slate-50 grid gap-4" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
            {columns.map((_, j) => <div key={j} className="skeleton h-4 rounded" style={{ width: `${60 + Math.random()*40}%` }} />)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            {columns.map(col => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap ${col.className || ''}`}
                style={col.width ? { width: col.width } : {}}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={row.id || i} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className={`px-4 py-3.5 text-slate-700 ${col.className || ''}`}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
