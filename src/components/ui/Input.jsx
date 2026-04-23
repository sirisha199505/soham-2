import { forwardRef } from 'react';

const baseInput = `
  w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800
  placeholder:text-slate-400 transition-all duration-150
  focus:outline-none focus:ring-2
  focus:ring-[#3BC0EF]/20 focus:border-[#3BC0EF]
  disabled:bg-slate-50 disabled:cursor-not-allowed
`;

const Input = forwardRef(function Input({
  label, error, hint, icon, iconEnd, required = false,
  className = '', containerClass = '', type = 'text', ...props
}, ref) {
  return (
    <div className={`flex flex-col gap-1.5 ${containerClass}`}>
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          type={type}
          className={`
            ${baseInput}
            ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-500/20' : 'border-slate-200'}
            ${icon ? 'pl-10' : ''}
            ${iconEnd ? 'pr-10' : ''}
            ${className}
          `}
          {...props}
        />
        {iconEnd && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {iconEnd}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
});

export default Input;

export function Select({ label, error, required, children, className = '', containerClass = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${containerClass}`}>
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        className={`
          w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800
          focus:outline-none focus:ring-2 focus:ring-[#3BC0EF]/20 focus:border-[#3BC0EF]
          ${error ? 'border-red-400' : ''} ${className}
        `}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, required, className = '', containerClass = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${containerClass}`}>
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        rows={4}
        className={`
          ${baseInput} resize-none
          ${error ? 'border-red-400 focus:border-red-400' : 'border-slate-200'}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
