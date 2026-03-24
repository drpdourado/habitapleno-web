import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const baseInputStyles = "w-full bg-white border border-slate-200 rounded-md h-10 px-3 text-sm font-normal text-slate-800 leading-tight placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  containerClassName?: string;
}

export const HabitaInput: React.FC<InputProps> = ({ label, error, icon, containerClassName, className, ...props }) => (
  <div className={cn("flex flex-col gap-1.5", containerClassName)}>
    {label && <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider ml-1">{label}</label>}
    <div className="relative group/input">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-500 transition-colors pointer-events-none">
          {icon}
        </div>
      )}
      <input 
        className={cn(
          baseInputStyles, 
          icon && "pl-11",
          error && "border-rose-500 focus:ring-rose-500/20 focus:border-rose-500", 
          className
        )} 
        {...props} 
      />
    </div>
    {error && <span className="text-[10px] font-bold text-rose-500 ml-1">{error}</span>}
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const HabitaSelect: React.FC<SelectProps> = ({ label, error, containerClassName, className, children, ...props }) => (
  <div className={cn("flex flex-col gap-1.5", containerClassName)}>
    {label && <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider ml-1">{label}</label>}
    <select className={cn(baseInputStyles, "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%2364748b%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10", error && "border-rose-500 focus:ring-rose-500/20 focus:border-rose-500", className)} {...props}>
      {children}
    </select>
    {error && <span className="text-[10px] font-bold text-rose-500 ml-1">{error}</span>}
  </div>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const HabitaTextarea: React.FC<TextareaProps> = ({ label, error, containerClassName, className, ...props }) => (
  <div className={cn("flex flex-col gap-1.5", containerClassName)}>
    {label && <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider ml-1">{label}</label>}
    <textarea className={cn(baseInputStyles, "min-h-[80px] resize-y", error && "border-rose-500 focus:ring-rose-500/20 focus:border-rose-500", className)} {...props} />
    {error && <span className="text-[10px] font-bold text-rose-500 ml-1">{error}</span>}
  </div>
);

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  containerClassName?: string;
}

export const HabitaCheckbox: React.FC<CheckboxProps> = ({ label, containerClassName, className, ...props }) => (
  <div className={cn("flex items-center gap-3 h-10 px-1", containerClassName)}>
    <div className="relative flex items-center">
      <input 
        type="checkbox"
        className={cn(
          "peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-200 bg-white transition-all checked:bg-indigo-600 checked:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
          className
        )}
        {...props}
      />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>
    {label && <label className="text-[11px] font-black text-slate-800 uppercase tracking-tight cursor-pointer">{label}</label>}
  </div>
);
