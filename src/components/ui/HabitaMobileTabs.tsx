import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HabitaMobileTabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  label?: string;
}

export const HabitaMobileTabs: React.FC<HabitaMobileTabsProps> = ({ 
  tabs, 
  activeTab, 
  onChange, 
  className,
  label = "Navegar" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Encontra a aba ativa ou a primeira se não encontrar
  const activeTabData = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <div className={cn("w-full", className)}>
      <div className="relative w-full" ref={containerRef}>
        <button
          type="button"
          id="habita-mobile-tabs-trigger"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm transition-all active:scale-[0.99]",
            isOpen ? "ring-2 ring-indigo-500/20 border-indigo-500 shadow-md" : "hover:border-slate-300"
          )}
        >
          <div className="flex items-center gap-3.5">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
              "bg-indigo-50 text-indigo-600"
            )}>
              {activeTabData.icon || <span className="text-[10px] font-black">{activeTabData.id.slice(0, 1).toUpperCase()}</span>}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{label}</span>
              <span className="text-[13px] font-black text-slate-800 uppercase tracking-tight leading-none">
                {activeTabData.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-px h-6 bg-slate-100 mx-1" />
              <ChevronDown size={20} className={cn("text-slate-400 transition-transform duration-300 ease-out", isOpen && "rotate-180")} />
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div 
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300 p-2"
          >
            <div className="space-y-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      onChange(tab.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 group",
                      isActive 
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
                    )}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className={cn(
                        "transition-all duration-300", 
                        isActive ? "scale-110 text-white" : "text-slate-400 group-hover:text-indigo-400 group-hover:scale-110"
                      )}>
                        {tab.icon}
                      </span>
                      <span className={cn(
                        "text-[11px] font-black uppercase tracking-widest", 
                        isActive ? "text-white" : "text-slate-500 group-hover:text-slate-800"
                      )}>
                        {tab.label}
                      </span>
                    </div>
                    {isActive ? (
                      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                        <Check size={12} className="text-white" strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
