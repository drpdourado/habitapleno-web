import React, { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface HabitaCalendarProps {
  selectedDate?: Date;
  onSelect?: (date: Date) => void;
  indicators?: Record<string, 'blue' | 'green' | 'red' | 'indigo'>; // YYYY-MM-DD
  className?: string;
}

export const HabitaCalendar: React.FC<HabitaCalendarProps> = ({
  selectedDate,
  onSelect,
  indicators = {},
  className,
}) => {
  const [viewDate, setViewDate] = useState(selectedDate || new Date());

  const month = viewDate.getMonth();
  const year = viewDate.getFullYear();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonthDays = new Date(year, month, 0).getDate();
  
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  const isSelected = (day: number) => {
    return (
      selectedDate?.getDate() === day &&
      selectedDate?.getMonth() === month &&
      selectedDate?.getFullYear() === year
    );
  };

  const renderDays = () => {
    const days = [];
    
    // Previous month overlap
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push(
        <div key={`prev-${i}`} className="h-8 flex items-center justify-center text-[10px] text-slate-300 font-medium">
          {prevMonthDays - i}
        </div>
      );
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const indicator = indicators[dateKey];
      
      days.push(
        <button
          key={`day-${d}`}
          onClick={() => onSelect?.(new Date(year, month, d))}
          className={cn(
            "h-8 relative flex flex-col items-center justify-center rounded-md transition-all group",
            isSelected(d) 
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
              : "hover:bg-slate-50 text-slate-600",
            isToday(d) && !isSelected(d) && "text-indigo-600 font-black"
          )}
        >
          <span className="text-[11px] font-bold">{d}</span>
          {indicator && (
            <div className={cn(
              "absolute bottom-1 w-1 h-1 rounded-full",
              indicator === 'blue' && "bg-blue-400",
              indicator === 'green' && "bg-emerald-400",
              indicator === 'red' && "bg-rose-400",
              indicator === 'indigo' && "bg-indigo-400",
              isSelected(d) && "bg-white"
            )} />
          )}
        </button>
      );
    }

    return days;
  };

  return (
    <div className={cn("inline-block bg-white rounded-md border border-slate-200 p-3 shadow-sm select-none w-full max-w-[260px]", className)}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest pl-1">
          {monthNames[month]} <span className="text-slate-400 font-medium ml-1">{year}</span>
        </h4>
        <div className="flex gap-1">
          <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-50 rounded text-slate-400">
            <ChevronLeft size={14} />
          </button>
          <button onClick={handleNextMonth} className="p-1 hover:bg-slate-50 rounded text-slate-400">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {daysOfWeek.map(day => (
          <div key={day} className="h-6 flex items-center justify-center text-[9px] font-black text-slate-400 uppercase tracking-tighter">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {renderDays()}
      </div>
    </div>
  );
};
