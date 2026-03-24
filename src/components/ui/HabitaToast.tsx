import React, { useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CheckCircle2, AlertCircle, AlertTriangle, X } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type HabitaToastType = 'success' | 'error' | 'info' | 'warning';

interface HabitaToastProps {
  message: string;
  type?: HabitaToastType;
  onClose: () => void;
  duration?: number;
  className?: string;
}

export const HabitaToast: React.FC<HabitaToastProps> = ({ 
  message, 
  type = 'success', 
  onClose, 
  duration = 5000,
  className 
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const variants = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-rose-50 border-rose-200 text-rose-800',
    info: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
  };

  const icons = {
    success: <CheckCircle2 size={18} className="text-emerald-500" />,
    error: <AlertCircle size={18} className="text-rose-500" />,
    info: <CheckCircle2 size={18} className="text-indigo-500" />,
    warning: <AlertTriangle size={18} className="text-amber-500" />,
  };

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-md border shadow-lg animate-in slide-in-from-right-full duration-300",
      variants[type],
      className
    )}>
      <div className="shrink-0">{icons[type]}</div>
      <p className="text-[11px] font-black uppercase tracking-widest leading-none flex-1">
        {message}
      </p>
      <button 
        onClick={onClose}
        className="shrink-0 p-1 hover:bg-black/5 rounded transition-colors"
      >
        <X size={14} className="opacity-40" />
      </button>
    </div>
  );
};
