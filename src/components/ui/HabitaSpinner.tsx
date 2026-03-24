import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HabitaSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'white' | 'slate' | 'emerald' | 'rose';
  className?: string;
  label?: string;
  showLabel?: boolean;
}

export const HabitaSpinner: React.FC<HabitaSpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  className,
  label = "Carregando...",
  showLabel = false
}) => {
  const sizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
    xl: 'w-16 h-16',
  };

  const variants = {
    primary: 'text-indigo-600',
    white: 'text-white',
    slate: 'text-slate-400',
    emerald: 'text-emerald-500',
    rose: 'text-rose-500',
  };

  const labelSizes = {
    xs: 'text-[8px]',
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <svg 
        className={cn("animate-spin", sizes[size], variants[variant])} 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-20" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        ></circle>
        <path 
          className="opacity-100" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      {showLabel && (
        <span className={cn(
          "font-black uppercase tracking-widest text-slate-400 animate-pulse", 
          labelSizes[size]
        )}>
          {label}
        </span>
      )}
    </div>
  );
};
