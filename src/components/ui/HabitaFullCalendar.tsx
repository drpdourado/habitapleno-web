import React, { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface HabitaEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: 'confirmed' | 'pending';
  owner?: string;
}

interface HabitaFullCalendarProps {
  events?: HabitaEvent[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: HabitaEvent) => void;
  className?: string;
}

export const HabitaFullCalendar: React.FC<HabitaFullCalendarProps> = ({
  events = [],
  onDateClick,
  onEventClick,
  className,
}) => {
  const [viewDate, setViewDate] = useState(new Date());

  const month = viewDate.getMonth();
  const year = viewDate.getFullYear();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const daysOfWeekShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  const renderCells = () => {
    const cells = [];
    
    // Previous month empty cells
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(
        <div key={`empty-${i}`} className="min-h-[120px] bg-slate-50/30 border-b border-r border-slate-100" />
      );
    }

    // Current month cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dayEvents = getEventsForDay(d);
      
      cells.push(
        <div 
          key={`day-${d}`} 
          className={cn(
            "min-h-[120px] p-2 border-b border-r border-slate-100 flex flex-col gap-1 transition-colors hover:bg-slate-50/50",
            isToday(d) && "bg-indigo-50/10"
          )}
          onClick={() => onDateClick?.(new Date(year, month, d))}
        >
          <div className="flex justify-between items-center mb-1">
            <span className={cn(
              "text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full",
              isToday(d) ? "bg-indigo-600 text-white" : "text-slate-400"
            )}>
              {d}
            </span>
          </div>
          
          <div className="flex flex-col gap-1 overflow-y-auto max-h-[85px] scrollbar-hide">
            {dayEvents.map(event => (
              <button
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick?.(event);
                }}
                className={cn(
                  "text-[9px] font-black p-1.5 rounded-md text-left truncate uppercase tracking-tighter border transition-all hover:scale-[1.02] active:scale-95",
                  event.type === 'confirmed' 
                    ? "bg-indigo-50 text-indigo-700 border-indigo-100" 
                    : "bg-amber-50 text-amber-700 border-amber-100"
                )}
              >
                {event.title}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Fill remaining cells for a complete grid
    const totalCells = cells.length;
    const remaining = 42 - totalCells; // 6 rows of 7 days
    for (let i = 0; i < remaining; i++) {
        cells.push(
            <div key={`fill-${i}`} className="min-h-[120px] bg-slate-50/30 border-b border-r border-slate-100" />
        );
    }

    return cells;
  };

  return (
    <div className={cn("w-full bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-md flex items-center justify-center shadow-md shadow-indigo-100">
            <CalendarIcon size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">
              {monthNames[month]}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{year}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrevMonth}
            className="p-2 hover:bg-white rounded-md border border-slate-100 transition-colors shadow-sm"
          >
            <ChevronLeft size={16} className="text-slate-500" />
          </button>
          <button 
            onClick={() => setViewDate(new Date())}
            className="px-3 h-8 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 border border-slate-100 bg-white rounded-md shadow-sm transition-colors"
          >
            Hoje
          </button>
          <button 
            onClick={handleNextMonth}
            className="p-2 hover:bg-white rounded-md border border-slate-100 transition-colors shadow-sm"
          >
            <ChevronRight size={16} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Days Filter / Days of Week */}
      <div className="grid grid-cols-7 bg-slate-50/50 border-b border-slate-100">
        {daysOfWeekShort.map((day) => (
          <div key={day} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 border-l border-slate-100">
        {renderCells()}
      </div>
    </div>
  );
};
