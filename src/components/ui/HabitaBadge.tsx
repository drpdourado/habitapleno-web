import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface HabitaBadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'indigo' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'xs' | 'sm';
  className?: string;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const HabitaBadge: React.FC<HabitaBadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className,
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold uppercase tracking-wider rounded-md transition-all';
  
  const variants = {
    neutral: 'bg-slate-100 text-slate-600 border border-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border border-amber-100',
    error: 'bg-rose-50 text-rose-700 border border-rose-100',
    outline: 'bg-transparent text-slate-500 border border-slate-200',
  };

  const sizes = {
    xs: 'px-1.5 py-0 text-[11px]',
    sm: 'px-2 py-0.5 text-sm',
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
};
