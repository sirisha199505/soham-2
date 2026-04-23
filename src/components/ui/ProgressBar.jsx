import { useTheme } from '../../context/ThemeContext';

export default function ProgressBar({ value = 0, max = 100, color = 'brand', size = 'md', showLabel = false, label }) {
  const { colors } = useTheme();
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const heights = { xs: 'h-1', sm: 'h-1.5', md: 'h-2', lg: 'h-3', xl: 'h-4' };

  const getBarColor = () => {
    if (color === 'auto') {
      if (pct >= 80) return colors.success;
      if (pct >= 60) return colors.secondary;
      return colors.error;
    }
    const map = {
      brand:   colors.primary,
      amber:   colors.secondary,
      navy:    colors.accent,
      green:   colors.success,
      red:     colors.error,
      indigo:  colors.primary,
      purple:  '#8B5CF6',
    };
    return map[color] || colors.primary;
  };

  return (
    <div className="w-full">
      {(showLabel || label) && (
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          {label && <span>{label}</span>}
          {showLabel && <span className="font-semibold">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={`w-full ${heights[size]} bg-slate-100 rounded-full overflow-hidden`}>
        <div
          className={`${heights[size]} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%`, background: getBarColor() }}
        />
      </div>
    </div>
  );
}
