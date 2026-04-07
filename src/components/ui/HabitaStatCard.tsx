import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface HabitaStatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string | number;
    type: 'up' | 'down' | 'neutral';
  };
  variant?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate' | 'blue-solid';
  subtext?: React.ReactNode;
  badge?: React.ReactNode;
  valueClassName?: string;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const HabitaStatCard: React.FC<HabitaStatCardProps> = ({
  label,
  value,
  icon,
  trend,
  variant = 'indigo',
  subtext,
  badge,
  valueClassName,
  className,
  ...props
}) => {
  const iconVariants = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-50 text-slate-500',
    'blue-solid': 'bg-white/20 text-white',
  };

  return (
    <div className={cn(
      "bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 transition-all",
      variant === 'blue-solid' && "bg-blue-600 border-blue-500 shadow-blue-200/50",
      props.onClick && "cursor-pointer hover:border-indigo-300 hover:shadow-md active:scale-[0.98]",
      className
    )} {...props}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className={cn(
            "text-[10px] font-black uppercase tracking-[0.2em]",
            variant === 'blue-solid' ? "text-blue-100/80" : "text-slate-400"
          )}>{label}</span>
          {badge}
        </div>
        <div className={cn("p-2 rounded-lg", iconVariants[variant])}>
          {React.isValidElement(icon) 
            ? React.cloneElement(icon as React.ReactElement, { size: 18 } as any) 
            : icon}
        </div>
      </div>
      
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <h4 className={cn(
            "text-xl md:text-2xl font-normal tracking-tight",
            variant === 'blue-solid' ? "text-white" : (valueClassName || "text-slate-900")
          )}>
            {value}
          </h4>
          {trend && (
            <div className={cn(
              "flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md",
              trend.type === 'up' ? "bg-emerald-100 text-emerald-700" : 
              trend.type === 'down' ? "bg-rose-100 text-rose-700" : 
              "bg-slate-100 text-slate-600"
            )}>
              {trend.type === 'up' ? <TrendingUp size={10} /> : trend.type === 'down' ? <TrendingDown size={10} /> : null}
              {trend.value}
            </div>
          )}
        </div>
        {subtext}
      </div>
    </div>
  );
};
