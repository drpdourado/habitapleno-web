import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * UTILITY: cn
 * Combina classes do Tailwind de forma inteligente, lidando com conflitos.
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type HabitaIconVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost' | 'outline';
export type HabitaIconSize = 'xs' | 'sm' | 'md' | 'lg';

interface HabitaIconActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: HabitaIconVariant;
  size?: HabitaIconSize;
  tooltip?: string;
  isLoading?: boolean;
}

/**
 * COMPONENT: HabitaIconActionButton
 * Um padrão para botões de ícone pequenos e precisos, ideal para ações em tabelas e listas.
 * Segue o padrão "Elegant Precision" do Habita Design System.
 */
export const HabitaIconActionButton: React.FC<HabitaIconActionButtonProps> = ({
  icon,
  variant = 'secondary',
  size = 'sm',
  tooltip,
  isLoading,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = "flex items-center justify-center transition-all duration-200 active:scale-90 disabled:opacity-30 disabled:pointer-events-none rounded-xl";

  const variants = {
    primary: "text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100",
    secondary: "text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-100",
    danger: "text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100",
    success: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100",
    warning: "text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-100",
    ghost: "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent",
    outline: "text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm"
  };

  const sizes = {
    xs: "w-7 h-7",
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12"
  };

  // Ícone escala conforme o tamanho
  const iconSizes = {
    xs: 14,
    sm: 16,
    md: 20,
    lg: 24
  };

  return (
    <button
      title={tooltip}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="animate-spin rounded-full border-2 border-current border-t-transparent" style={{ width: iconSizes[size], height: iconSizes[size] }} />
      ) : (
        React.isValidElement(icon) 
          ? React.cloneElement(icon as React.ReactElement<any>, { size: iconSizes[size] }) 
          : icon
      )}
    </button>
  );
};
