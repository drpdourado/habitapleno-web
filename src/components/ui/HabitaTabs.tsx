import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HabitaTabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  fullWidth?: boolean;
}

export const HabitaTabs: React.FC<HabitaTabsProps> = ({ tabs, activeTab, onChange, className, fullWidth }) => {
  return (
    <div className={cn(
      "w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]", 
      className
    )}>
      <div className={cn(
        "flex items-center gap-1 border-b border-slate-100 p-1", 
        fullWidth ? "w-full" : "min-w-max"
      )}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl whitespace-nowrap",
                fullWidth ? "flex-1" : "flex-initial",
                isActive 
                  ? "bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100/50" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              )}
            >
              {tab.icon && <span className={cn("transition-transform", isActive ? "scale-110" : "scale-100")}>{tab.icon}</span>}
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
