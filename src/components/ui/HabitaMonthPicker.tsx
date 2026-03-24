import React, { useState, useRef, useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { baseInputStyles } from './HabitaForm';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HabitaMonthPickerProps {
  label?: string;
  value?: string; // Formato "YYYY-MM"
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
  error?: string;
  disabled?: boolean;
}

export const HabitaMonthPicker: React.FC<HabitaMonthPickerProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Selecione o mês',
  className,
  containerClassName,
  error,
  disabled
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Inicialização do ano de visualização baseado no valor ou data atual
  const initialDate = value ? new Date(value + '-02') : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sincroniza o ano de visualização se o valor mudar externamente
  useEffect(() => {
    if (value) {
      const year = parseInt(value.split('-')[0]);
      if (!isNaN(year)) setViewYear(year);
    }
  }, [value]);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const formatValue = (val?: string) => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length !== 2) return val;
    const year = parts[0];
    const monthIdx = parseInt(parts[1]) - 1;
    return `${monthNames[monthIdx]} / ${year}`;
  };

  const handleSelect = (monthIdx: number) => {
    const newValue = `${viewYear}-${(monthIdx + 1).toString().padStart(2, '0')}`;
    onChange?.(newValue);
    setIsOpen(false);
  };

  return (
    <div className={cn("flex flex-col gap-1.5 w-full relative", containerClassName)} ref={containerRef}>
      {label && (
        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider pl-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            baseInputStyles,
            "flex items-center gap-2 text-left transition-all",
            isOpen && "border-indigo-500 ring-2 ring-indigo-500/10",
            error && "border-rose-500 focus:ring-rose-500/10",
            !value && !disabled && "text-slate-500 font-normal",
            className
          )}
        >
          <CalendarIcon size={15} className={cn("shrink-0", isOpen ? "text-indigo-500" : "text-slate-400")} />
          <span className="flex-1 truncate">
            {value ? formatValue(value) : placeholder}
          </span>
          <ChevronDown size={14} className={cn("text-slate-300 transition-transform flex-shrink-0", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-left bg-white border border-slate-200 rounded-lg p-4 shadow-xl w-[260px]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
              <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest pl-1">
                Ano <span className="text-indigo-600 ml-1">{viewYear}</span>
              </h4>
              <div className="flex gap-1">
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setViewYear(prev => prev - 1); }} 
                  className="p-1 hover:bg-slate-50 rounded text-slate-400 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setViewYear(prev => prev + 1); }} 
                  className="p-1 hover:bg-slate-50 rounded text-slate-400 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {monthNames.map((name, idx) => {
                const isSelected = value === `${viewYear}-${(idx + 1).toString().padStart(2, '0')}`;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleSelect(idx)}
                    className={cn(
                      "py-2.5 px-1 text-[11px] font-bold rounded-md transition-all uppercase tracking-tighter",
                      isSelected 
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                        : "hover:bg-slate-50 text-slate-600"
                    )}
                  >
                    {name.substring(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-[10px] font-bold text-rose-500 pl-1">{error}</p>}
    </div>
  );
};
