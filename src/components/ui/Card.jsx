export default function Card({ children, className = '', hover = false, padding = true }) {
  return (
    <div className={`
      bg-white rounded-2xl border border-slate-100/60 shadow-sm
      ${padding ? 'p-5' : ''}
      ${hover ? 'card-hover cursor-pointer' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, icon }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100">
            {icon}
          </div>
        )}
        <div>
          <h3 className="font-bold text-slate-800 text-base leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-lg font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>{title}</h2>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
