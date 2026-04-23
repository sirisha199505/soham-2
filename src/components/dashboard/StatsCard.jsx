import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function StatsCard({ title, value, subtitle, icon, trend, trendValue, color = 'brand', loading = false }) {
  const { colors } = useTheme();

  const palette = {
    brand:  { from: colors.primary,    to: '#1aaad8',  text: colors.primary,    soft: `${colors.primary}18` },
    amber:  { from: colors.secondary,  to: '#e57c00',  text: colors.secondary,  soft: `${colors.secondary}18` },
    navy:   { from: colors.accent,     to: '#0f1e4a',  text: colors.accent,     soft: `${colors.accent}14` },
    green:  { from: colors.success,    to: '#059669',  text: colors.success,    soft: `${colors.success}18` },
    red:    { from: colors.error,      to: '#dc2626',  text: colors.error,      soft: `${colors.error}15` },
    girls:  { from: colors.girlsColor, to: '#db2777',  text: colors.girlsColor, soft: `${colors.girlsColor}15` },
    purple: { from: '#8B5CF6',         to: '#7c3aed',  text: '#8B5CF6',         soft: '#8B5CF618' },
    // aliases
    indigo: { from: colors.primary,    to: '#1aaad8',  text: colors.primary,    soft: `${colors.primary}18` },
    orange: { from: colors.secondary,  to: '#e57c00',  text: colors.secondary,  soft: `${colors.secondary}18` },
    blue:   { from: colors.primary,    to: '#1aaad8',  text: colors.primary,    soft: `${colors.primary}18` },
  };
  const c = palette[color] || palette.brand;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendStyle = {
    up:   { color: colors.success, bg: `${colors.success}18` },
    down: { color: colors.error,   bg: `${colors.error}15`   },
  }[trend] || { color: '#94a3b8', bg: '#f1f5f9' };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100/60">
        <div className="flex items-center gap-3 mb-4">
          <div className="skeleton w-11 h-11 rounded-xl" />
          <div className="flex-1"><div className="skeleton h-3.5 w-3/4 rounded mb-2" /></div>
        </div>
        <div className="skeleton h-8 w-1/2 rounded mb-2" />
        <div className="skeleton h-3 w-full rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100/60 p-5 card-hover relative overflow-hidden">
      {/* Decorative gradient corner */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-[3rem] opacity-[0.06]"
        style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }} />

      <div className="flex items-start justify-between mb-4 relative">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${c.from}22, ${c.to}15)`, color: c.text, border: `1.5px solid ${c.from}25` }}
        >
          {icon}
        </div>
        {trendValue && (
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ color: trendStyle.color, background: trendStyle.bg }}
          >
            <TrendIcon size={11} />{trendValue}
          </span>
        )}
      </div>

      <p
        className="text-[1.85rem] font-bold text-slate-800 leading-none mb-1 relative"
        style={{ fontFamily: 'Space Grotesk' }}
      >
        {value}
      </p>
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}

      {/* Bottom accent bar */}
      <div
        className="absolute bottom-0 left-0 h-[3px] w-full"
        style={{ background: `linear-gradient(90deg, ${c.from}, ${c.to}60)` }}
      />
    </div>
  );
}
