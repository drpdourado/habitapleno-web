import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ShieldCheck } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const HabitaLogo = ({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = {
    sm: 'h-8 text-lg',
    md: 'h-12 text-2xl',
    lg: 'h-16 text-4xl',
  };

  const iconSizes = {
    sm: 20,
    md: 28,
    lg: 40,
  };

  return (
    <div className={cn("flex items-center gap-2 select-none text-slate-900", className)}>
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
        <div className="relative bg-gradient-to-br from-indigo-600 to-indigo-800 p-2 rounded-xl shadow-lg border border-indigo-400/20">
          <ShieldCheck size={iconSizes[size]} className="text-white drop-shadow-md" />
        </div>
      </div>
      <div className={cn("flex flex-col leading-tight", sizes[size])}>
        <span className="font-black tracking-tighter">
          HABITA<span className="text-indigo-600 font-black">PLENO</span>
        </span>
        <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-slate-400 opacity-80 -mt-1 pl-0.5">
          Gestão Inteligente
        </span>
      </div>
    </div>
  );
};
