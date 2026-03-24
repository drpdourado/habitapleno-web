import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface HabitaShortcutProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  variant?: 'horizontal' | 'grid';
  className?: string;
  iconClassName?: string;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const HabitaShortcut: React.FC<HabitaShortcutProps> = ({
  icon,
  label,
  onClick,
  variant = 'horizontal',
  className,
  iconClassName,
}) => {
  const baseStyles = cn(
    "flex items-center justify-center transition-all duration-200 cursor-pointer",
    "bg-white border border-slate-200 rounded-lg group",
    "hover:bg-indigo-50 hover:border-indigo-200 hover:shadow-sm active:scale-95",
    variant === 'horizontal' ? "flex-row gap-3 py-2.5 px-4 h-11" : "flex-col gap-2 p-4 min-w-[100px]",
    className
  );

  return (
    <div onClick={onClick} className={baseStyles}>
      <div className={cn(
        "text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0",
        variant === 'grid' && "p-2 bg-slate-50 rounded-lg group-hover:bg-white",
        iconClassName
      )}>
        {React.isValidElement(icon) 
          ? React.cloneElement(icon as React.ReactElement, { size: variant === 'grid' ? 24 : 18 } as any) 
          : icon}
      </div>
      <span className={cn(
        "text-[11px] font-black text-slate-700 uppercase tracking-widest truncate",
        variant === 'grid' && "mt-1"
      )}>
        {label}
      </span>
    </div>
  );
};
