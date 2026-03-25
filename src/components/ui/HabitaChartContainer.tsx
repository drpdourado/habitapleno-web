import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface HabitaChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  legend?: Array<{ label: string; color: string }>;
  extra?: React.ReactNode;
  className?: string;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const HabitaChartContainer: React.FC<HabitaChartContainerProps> = ({
  title,
  subtitle,
  children,
  legend,
  extra,
  className,
}) => {
  return (
    <div className={cn("bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-6", className)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center justify-between flex-1">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-500 font-medium uppercase tracking-tight mt-1">{subtitle}</p>}
          </div>
          {extra && <div className="ml-4">{extra}</div>}
        </div>
        
        {legend && (
          <div className="flex flex-wrap items-center gap-4">
            {legend.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-md" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-full flex flex-col relative min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
};
