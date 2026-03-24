import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface HabitaHeadingProps {
  children: React.ReactNode;
  level?: 1 | 2 | 3 | 4;
  className?: string;
  icon?: React.ReactNode;
  subtitle?: string;
  subtitleClassName?: string;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const HabitaHeading: React.FC<HabitaHeadingProps> = ({
  children,
  level = 1,
  className,
  icon,
  subtitle,
  subtitleClassName
}) => {
  const Tag = `h${level}` as any;
  
  const levels = {
    1: 'text-2xl md:text-3xl font-bold text-slate-800 tracking-tight',
    2: 'text-lg md:text-xl font-bold text-slate-800 tracking-tight',
    3: 'text-lg font-bold text-slate-700 tracking-tight',
    4: 'text-sm font-bold text-slate-600 uppercase tracking-wider',
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-3">
        {icon && <div className="text-indigo-600 shrink-0">{icon}</div>}
        <Tag className={cn(levels[level], className)}>
          {children}
        </Tag>
      </div>
      {subtitle && (
        <p className={cn("text-slate-500 text-sm font-medium uppercase tracking-tight pl-0.5", subtitleClassName)}>
          {subtitle}
        </p>
      )}
    </div>
  );
};
