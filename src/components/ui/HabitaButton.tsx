import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { HabitaSpinner } from './HabitaSpinner';

interface HabitaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const HabitaButton: React.FC<HabitaButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  iconPosition = 'left',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2 gap-2 text-center';
  
  const variants = {
    primary: 'bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700 hover:border-indigo-700 focus:ring-indigo-500 shadow-sm',
    secondary: 'bg-slate-800 text-white border border-slate-800 hover:bg-slate-900 hover:border-slate-900 focus:ring-slate-700 shadow-sm',
    outline: 'bg-transparent text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-400',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent focus:ring-slate-200',
    danger: 'bg-rose-600 text-white border border-rose-600 hover:bg-rose-700 hover:border-rose-700 focus:ring-rose-500 shadow-sm',
    success: 'bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700 hover:border-emerald-700 focus:ring-emerald-500 shadow-sm',
    warning: 'bg-amber-500 text-white border border-amber-500 hover:bg-amber-600 hover:border-amber-600 focus:ring-amber-400 shadow-sm',
  };

  const sizes = {
    sm: 'h-8 px-4 text-[9px]',
    md: 'h-10 px-6 text-[10px]',
    lg: 'h-12 px-8 text-[11px]',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && (
        <HabitaSpinner size="sm" variant={variant === 'primary' || variant === 'secondary' || variant === 'danger' || variant === 'success' || variant === 'warning' ? 'white' : 'primary'} />
      )}
      {!isLoading && icon && iconPosition === 'left' && icon}
      {children}
      {!isLoading && icon && iconPosition === 'right' && icon}
    </button>
  );
};
