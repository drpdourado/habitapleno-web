import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown, Search, X, Check } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface HabitaOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
  sublabel?: string; // Added for extra info like balances
}

interface HabitaComboboxProps {
  label?: string;
  options: HabitaOption[];
  value?: string | string[];
  onChange?: (value: any) => void;
  placeholder?: string;
  searchable?: boolean;
  multiSelect?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
  containerClassName?: string;
}

export const HabitaCombobox: React.FC<HabitaComboboxProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = "Selecione uma opção...",
  searchable = false,
  multiSelect = false,
  error,
  disabled = false,
  className,
  containerClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const portal = document.getElementById('habita-combobox-portal');
        if (portal && portal.contains(event.target as Node)) return;
        setIsOpen(false);
      }
    };
    if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Update positioning for Portal
  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
        const updatePos = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const triggerElement = containerRef.current.querySelector('.habita-combobox-trigger');
                const triggerRect = triggerElement ? triggerElement.getBoundingClientRect() : rect;
                
                setCoords({
                    top: triggerRect.bottom,
                    left: triggerRect.left,
                    width: triggerRect.width
                });
            }
        };
        
        updatePos();
        window.addEventListener('resize', updatePos);
        window.addEventListener('scroll', updatePos, true);
        return () => {
            window.removeEventListener('resize', updatePos);
            window.removeEventListener('scroll', updatePos, true);
        };
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(opt => 
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (opt.group && opt.group.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [options, searchTerm]);

  const selectedOptions = useMemo(() => {
    if (!value) return [];
    if (multiSelect && Array.isArray(value)) {
      return options.filter(opt => value.includes(opt.value));
    }
    const single = options.find(opt => opt.value === value);
    return single ? [single] : [];
  }, [value, options, multiSelect]);

  const handleSelect = (option: HabitaOption) => {
    if (disabled || option.disabled) return;

    if (multiSelect) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValue = currentValues.includes(option.value)
        ? currentValues.filter(v => v !== option.value)
        : [...currentValues, option.value];
      onChange?.(newValue);
    } else {
      onChange?.(option.value);
      setIsOpen(false);
    }
  };

  const removeOption = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    const currentValues = Array.isArray(value) ? value : [];
    onChange?.(currentValues.filter(v => v !== val));
  };

  const dropdownMenu = (
    <div 
        id="habita-combobox-portal"
        className="fixed bg-white border border-slate-200 rounded-md shadow-2xl z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        style={{
            top: `${coords.top + 4}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`
        }}
    >
        {searchable && (
        <div className="p-2 border-b border-slate-100">
            <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
                autoFocus
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-md pl-9 pr-3 py-2 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 outline-none"
                onClick={(e) => e.stopPropagation()}
            />
            </div>
        </div>
        )}
        
        <div className="max-h-[280px] overflow-y-auto p-1 custom-scrollbar">
        {filteredOptions.length > 0 ? (
            (() => {
                let lastGroup = '';
                return filteredOptions.map((option, idx) => {
                    const isSelected = multiSelect 
                        ? (Array.isArray(value) && value.includes(option.value))
                        : value === option.value;
                    
                    const showGroup = option.group && option.group !== lastGroup;
                    if (option.group) lastGroup = option.group;

                    return (
                        <React.Fragment key={option.value || idx}>
                            {showGroup && (
                                <div className="px-3 py-2 mt-1 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] bg-slate-50/50 rounded-sm mb-1">
                                    {option.group}
                                </div>
                            )}
                            <div
                                onClick={(e) => { e.stopPropagation(); handleSelect(option); }}
                                className={cn(
                                    "flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer transition-colors text-sm font-normal",
                                    isSelected ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-700 hover:bg-slate-50",
                                    option.disabled && "opacity-40 cursor-not-allowed grayscale"
                                )}
                            >
                                <div className="flex flex-col">
                                    <span>{option.label}</span>
                                    {option.sublabel && (
                                        <span className="text-[10px] text-slate-400 font-normal mt-0.5">{option.sublabel}</span>
                                    )}
                                </div>
                                {isSelected && <Check size={14} className="text-indigo-600" />}
                            </div>
                        </React.Fragment>
                    );
                });
            })()
        ) : (
            <div className="px-4 py-8 text-center">
            <p className="text-xs font-medium text-slate-300 uppercase tracking-widest">Nenhum resultado</p>
            </div>
        )}
        </div>
    </div>
  );

  return (
    <div className={cn("flex flex-col gap-1.5 w-full relative", containerClassName)} ref={containerRef}>
      {label && <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider ml-1">{label}</label>}
      
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "habita-combobox-trigger w-full bg-white border border-slate-200 rounded-md min-h-[40px] px-3 py-1.5 flex items-center justify-between gap-2 cursor-pointer transition-all",
          isOpen && "ring-2 ring-indigo-500/20 border-indigo-500",
          error && "border-rose-500 ring-rose-500/10",
          disabled && "bg-slate-50 cursor-not-allowed opacity-70",
          className
        )}
      >
        <div className="flex flex-wrap gap-1.5 flex-1 items-center">
          {selectedOptions.length > 0 ? (
            selectedOptions.map(opt => (
              multiSelect ? (
                <span key={opt.value} className="bg-indigo-50 text-indigo-700 text-[11px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                  {opt.label}
                  {!disabled && <X size={12} className="cursor-pointer hover:text-indigo-900" onClick={(e) => removeOption(opt.value, e)} />}
                </span>
              ) : (
                <span key={opt.value} className="text-sm font-normal text-slate-700">{opt.label}</span>
              )
            ))
          ) : (
            <span className="text-sm text-slate-500 font-medium">{placeholder}</span>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-slate-400">
          {isOpen && searchable && <Search size={14} className="text-slate-300" />}
          <ChevronDown size={16} className={cn("transition-transform duration-200", isOpen && "rotate-180")} />
        </div>
      </div>

      {error && <span className="text-[10px] font-bold text-rose-500 ml-1">{error}</span>}

      {/* Portal Dropdown */}
      {isOpen && createPortal(dropdownMenu, document.body)}
    </div>
  );
};
