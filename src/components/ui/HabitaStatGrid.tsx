import React from 'react';
import { HabitaCard, HabitaCardHeader, HabitaCardTitle } from './HabitaCard';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface HabitaMetricItem {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  variant?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'rose-solid' | 'slate';
  subtext?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  action?: {
    icon: React.ReactNode;
    onClick: () => void;
    tooltip?: string;
  };
}

interface HabitaStatGridProps {
  title: string;
  icon?: React.ReactNode;
  iconClassName?: string;
  metrics: HabitaMetricItem[];
  cols?: 1 | 2 | 3 | 4 | 5;
  className?: string;
  headerAction?: React.ReactNode;
  cellClassName?: string;
}

/**
 * HabitaStatGrid - Um card consolidado que exibe múltiplos indicadores em uma grade.
 * Ideal para visões mobile ou dashboards compactos onde o espaço é limitado.
 */
export const HabitaStatGrid: React.FC<HabitaStatGridProps> = ({
  title,
  icon,
  iconClassName,
  metrics,
  cols = 2,
  className,
  headerAction,
  cellClassName
}) => {
  
  const getColsClass = (c: number) => {
    switch (c) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-2';
      case 3: return 'md:grid-cols-3 grid-cols-2';
      case 4: return 'md:grid-cols-4 grid-cols-2';
      case 5: return 'md:grid-cols-5 grid-cols-2';
      default: return 'md:grid-cols-2 grid-cols-2';
    }
  };

  const variantStyles = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-500',
    'rose-solid': 'bg-rose-600 text-white',
    slate: 'bg-slate-50 text-slate-500',
  };

  return (
    <HabitaCard className={cn("shadow-sm border-slate-200", className)} padding="none">
      <HabitaCardHeader className="py-2 md:py-3 px-3.5 md:px-5 border-b border-slate-100 flex flex-row items-center justify-between mb-0">
        <div className="flex items-center gap-2">
          {icon && (
             <div className={cn("flex items-center justify-center", iconClassName)}>
                {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement, { size: 18 } as any) : icon}
             </div>
          )}
          <HabitaCardTitle className="text-xs font-bold text-slate-700 uppercase tracking-tight">
            {title}
          </HabitaCardTitle>
        </div>
        {headerAction}
      </HabitaCardHeader>

      <div className={cn("grid divide-x divide-y divide-slate-100", getColsClass(cols))}>
        {metrics.map((metric, idx) => (
          <div 
            key={`${metric.label}-${idx}`}
            className={cn(
              "p-4 md:p-5 flex flex-col gap-1.5 transition-colors",
              metric.onClick && "cursor-pointer hover:bg-slate-50 active:bg-slate-100",
              cellClassName,
              metric.className
            )}
            onClick={metric.onClick}
          >
            <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                {metric.label}
                </span>
                {metric.action && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); metric.action?.onClick(); }}
                    title={metric.action.tooltip}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                  >
                    {React.isValidElement(metric.action.icon) ? React.cloneElement(metric.action.icon as React.ReactElement, { size: 14 } as any) : metric.action.icon}
                  </button>
                )}
            </div>
            
            <h4 className={cn(
               "text-lg md:text-xl font-black tracking-tight mt-0.5",
               metric.variant === 'emerald' ? "text-emerald-600" :
               metric.variant === 'amber' ? "text-amber-600" :
               metric.variant === 'rose' || metric.variant === 'rose-solid' ? "text-slate-800" : 
               "text-slate-900"
            )}>
              {metric.value}
            </h4>

            {(metric.icon || metric.subtext) && (
              <div className="flex items-center gap-2 mt-auto pt-2">
                {metric.icon && (
                  <div className={cn("p-1.5 rounded-md flex items-center justify-center", variantStyles[metric.variant || 'slate'])}>
                    {React.isValidElement(metric.icon) ? React.cloneElement(metric.icon as React.ReactElement, { size: 14 } as any) : metric.icon}
                  </div>
                )}
                {metric.subtext && (
                  <span className={cn(
                    "text-[9px] font-black uppercase",
                    metric.variant === 'rose' || metric.variant === 'rose-solid' ? "text-rose-600" : "text-slate-400"
                  )}>
                    {metric.subtext}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </HabitaCard>
  );
};
