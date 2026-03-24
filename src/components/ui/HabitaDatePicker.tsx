import React, { useState, useRef, useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { baseInputStyles } from './HabitaForm';
import { HabitaCalendar } from './HabitaCalendar';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HabitaDatePickerProps {
  label?: string;
  value?: Date;
  onChange?: (date: Date) => void;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
  error?: string;
  disabled?: boolean;
}

export const HabitaDatePicker: React.FC<HabitaDatePickerProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Selecione uma data',
  className,
  containerClassName,
  error,
  disabled
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className={cn("flex flex-col gap-1.5 w-full", containerClassName)} ref={containerRef}>
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
            {value ? formatDate(value) : placeholder}
          </span>
          <ChevronDown size={14} className={cn("text-slate-300 transition-transform flex-shrink-0", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-left">
            <HabitaCalendar 
              selectedDate={value}
              onSelect={(date: Date) => {
                onChange?.(date);
                setIsOpen(false);
              }}
              className="shadow-xl"
            />
          </div>
        )}
      </div>

      {error && <p className="text-[10px] font-bold text-rose-500 pl-1">{error}</p>}
    </div>
  );
};
