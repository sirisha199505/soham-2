// Variant → [bg, text] using brand token hex values so no Tailwind purge issues
const variants = {
  default:   'bg-slate-100 text-slate-600',
  primary:   'bg-[#3BC0EF]/15 text-[#1589b5]',
  success:   'bg-emerald-100 text-emerald-700',
  warning:   'bg-[#FAAB34]/15 text-[#b97308]',
  danger:    'bg-red-100 text-red-600',
  purple:    'bg-purple-100 text-purple-700',
  info:      'bg-[#3BC0EF]/10 text-[#1589b5]',
  navy:      'bg-[#1E3A8A]/10 text-[#1E3A8A]',
  // difficulty
  easy:      'bg-emerald-100 text-emerald-700',
  medium:    'bg-[#FAAB34]/15 text-[#b97308]',
  hard:      'bg-red-100 text-red-600',
  // status
  active:    'bg-emerald-100 text-emerald-700',
  inactive:  'bg-slate-100 text-slate-500',
  draft:     'bg-slate-100 text-slate-600',
  published: 'bg-[#3BC0EF]/15 text-[#1589b5]',
  scheduled: 'bg-[#1E3A8A]/10 text-[#1E3A8A]',
  closed:    'bg-slate-200 text-slate-500',
  passed:    'bg-emerald-100 text-emerald-700',
  failed:    'bg-red-100 text-red-600',
};

export default function Badge({ children, variant = 'default', dot = false, className = '' }) {
  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
      text-xs font-medium
      ${variants[variant] || variants.default}
      ${className}
    `}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
