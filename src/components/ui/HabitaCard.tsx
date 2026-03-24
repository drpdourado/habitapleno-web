import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface HabitaCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'white' | 'slate' | 'indigo' | 'outline' | 'integrated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  allowOverflow?: boolean;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const HabitaCard: React.FC<HabitaCardProps> = ({
  children,
  className,
  variant = 'white',
  padding = 'md',
  allowOverflow = false,
  ...props
}) => {
  const baseStyles = cn(
    'transition-all duration-300',
    !allowOverflow && 'overflow-hidden'
  );
  
  const variants = {
    white: 'bg-white border-slate-200 border rounded-md shadow-sm',
    slate: 'bg-slate-50 border-slate-200 border rounded-md shadow-inner',
    indigo: 'bg-indigo-600 border-indigo-500 border rounded-md text-white shadow-lg',
    outline: 'bg-transparent border-slate-200 border border-dashed rounded-md',
    integrated: 'bg-white border-slate-200 border rounded-md shadow-none',
  };

  const paddings = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4 md:p-5',
    lg: 'p-4 md:p-6',
  };

  return (
    <div 
        className={cn(baseStyles, variants[variant], paddings[padding], className)}
        {...props}
    >
      {children}
    </div>
  );
};

export const HabitaCardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("border-b border-slate-100 mb-6 pb-2 px-1 flex items-center justify-between", className)}>
    {children}
  </div>
);

export const HabitaCardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <h3 className={cn("text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]", className)}>
    {children}
  </h3>
);

export const HabitaCardContent: React.FC<{ children: React.ReactNode; className?: string; padding?: 'none' | 'sm' | 'md' | 'lg' }> = ({ children, className, padding = 'none' }) => {
  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };
  return (
    <div className={cn(paddings[padding], className)}>
      {children}
    </div>
  );
};

export const HabitaCardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("border-t border-slate-50 mt-auto", className)}>
    {children}
  </div>
);
