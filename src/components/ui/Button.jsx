import { Loader2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const sizes = {
  xs: 'px-2.5 py-1 text-xs gap-1',
  sm: 'px-3.5 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-2.5 text-base gap-2',
  xl: 'px-8 py-3 text-base gap-2.5',
};

export default function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false,
  fullWidth = false, icon, iconEnd, className = '',
  style: extraStyle = {},
  ...props
}) {
  const { colors } = useTheme();

  // Inline-style variants keyed to brand tokens
  const variantStyles = {
    primary: {
      background: colors.primary,
      color: '#fff',
      boxShadow: `0 4px 14px 0 ${colors.primary}44`,
    },
    secondary: {
      background: '#fff',
      color: colors.textPrimary,
      border: '1px solid #e2e8f0',
    },
    danger: {
      background: colors.error,
      color: '#fff',
      boxShadow: `0 4px 14px 0 ${colors.error}44`,
    },
    ghost: {
      background: 'transparent',
      color: colors.textSecondary,
    },
    accent: {
      background: colors.accent,
      color: '#fff',
      boxShadow: `0 4px 14px 0 ${colors.accent}44`,
    },
    amber: {
      background: colors.secondary,
      color: '#fff',
      boxShadow: `0 4px 14px 0 ${colors.secondary}44`,
    },
    success: {
      background: colors.success,
      color: '#fff',
      boxShadow: `0 4px 14px 0 ${colors.success}44`,
    },
    outline: {
      background: 'transparent',
      color: colors.primary,
      border: `1.5px solid ${colors.primary}`,
    },
    outlineAmber: {
      background: 'transparent',
      color: colors.secondary,
      border: `1.5px solid ${colors.secondary}`,
    },
  };

  const base = variantStyles[variant] || variantStyles.primary;

  return (
    <button
      disabled={disabled || loading}
      style={{ ...base, ...extraStyle }}
      className={`
        inline-flex items-center justify-center font-medium rounded-xl
        transition-all duration-150 cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        hover:opacity-90 active:scale-[0.98]
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
      {!loading && iconEnd}
    </button>
  );
}
