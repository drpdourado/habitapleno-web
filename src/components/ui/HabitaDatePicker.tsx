import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Also check if click was on the portal element (if we used an ID but here we just check if the target is in document.body but not in container)
        // Actually the portal is at the root, so this outside-click is tricky. 
        // We'll trust that the portal click stays internal if we handle it well. 
      }
      
      // More robust check:
      const portalElements = document.querySelectorAll('.habita-datepicker-portal');
      let isInsidePortal = false;
      portalElements.forEach(el => {
        if (el.contains(event.target as Node)) isInsidePortal = true;
      });

      if (containerRef.current && !containerRef.current.contains(event.target as Node) && !isInsidePortal) {
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
        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider pl-1 font-sans">
          {label}
        </label>
      )}
      
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            baseInputStyles,
            "flex items-center gap-2 text-left transition-all font-sans",
            isOpen && "border-indigo-500 ring-2 ring-indigo-500/10",
            error && "border-rose-500 focus:ring-rose-500/10",
            !value && !disabled && "text-slate-400 font-medium",
            className
          )}
        >
          <CalendarIcon size={14} className={cn("shrink-0", isOpen ? "text-indigo-500" : "text-slate-400")} />
          <span className="flex-1 truncate tracking-tight">
            {value ? formatDate(value) : placeholder}
          </span>
          <ChevronDown size={14} className={cn("text-slate-300 transition-transform flex-shrink-0", isOpen && "rotate-180")} />
        </button>

        {isOpen && createPortal(
          <div 
            className="habita-datepicker-portal fixed z-[9999] animate-in fade-in zoom-in-95 duration-200 origin-top-left"
            style={{ 
                top: coords.top + 8, 
                left: coords.left,
                // On mobile we might want to center it or align correctly
                // But for now keeping same logic as simple absolute
            }}
          >
            <HabitaCalendar 
              selectedDate={value}
              onSelect={(date: Date) => {
                onChange?.(date);
                setIsOpen(false);
              }}
              className="shadow-2xl border border-slate-200"
            />
          </div>,
          document.body
        )}
      </div>

      {error && <p className="text-[10px] font-bold text-rose-500 pl-1 font-sans">{error}</p>}
    </div>
  );
};
