import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { HabitaCard } from './HabitaCard';
import { HabitaHeading } from './HabitaHeading';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HabitaContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const HabitaContainer: React.FC<HabitaContainerProps> = ({ 
  children, 
  className 
}) => {
  return (
    <HabitaCard 
      padding="none" 
      className={cn(
        "bg-white rounded-xl md:rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]",
        className
      )}
    >
      {children}
    </HabitaCard>
  );
};

interface HabitaContainerHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  iconVariant?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';
}

export const HabitaContainerHeader: React.FC<HabitaContainerHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
  className,
  iconVariant = 'indigo'
}) => {
  const iconVariants = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    slate: "bg-slate-50 text-slate-600 border-slate-100",
  };

  return (
    <div className={cn("p-5 md:p-8 pb-8 bg-slate-50/20 border-b border-slate-100 shrink-0", className)}>
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {icon && (
            <div className={cn("p-3 rounded-xl border shadow-sm", iconVariants[iconVariant])}>
              {icon}
            </div>
          )}
          <div className="flex flex-col">
            <HabitaHeading level={1} className="mb-0 border-none p-0 text-slate-900 font-black">
              {title}
            </HabitaHeading>
            {subtitle && (
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </header>
    </div>
  );
};

interface HabitaContainerContentProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const HabitaContainerContent: React.FC<HabitaContainerContentProps> = ({
  children,
  className,
  padding = 'none'
}) => {
  const paddings = {
    none: "p-0",
    sm: "p-4",
    md: "p-6 md:p-8",
    lg: "p-8 md:p-12",
  };

  return (
    <div className={cn("flex-1 flex flex-col", paddings[padding], className)}>
      {children}
    </div>
  );
};
