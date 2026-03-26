import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HabitaTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tooltipClassName?: string;
}

export const HabitaTooltip: React.FC<HabitaTooltipProps> = ({ 
  content, 
  children, 
  className,
  tooltipClassName 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Position above the element by default
      setCoords({
        top: rect.top,
        left: rect.left + (rect.width / 2)
      });
    }
  };

  useEffect(() => {
    if (isVisible) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isVisible]);

  return (
    <div 
      ref={triggerRef}
      className={cn("inline-block", className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && createPortal(
        <div 
          className={cn(
            "fixed z-[9999] pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2",
            "bg-slate-900 text-white rounded-xl p-3 text-[10px] shadow-2xl",
            "animate-in fade-in zoom-in-95 duration-200",
            tooltipClassName
          )}
          style={{ 
            top: coords.top - 5, // 5px gap
            left: coords.left 
          }}
        >
          {content}
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
        </div>,
        document.body
      )}
    </div>
  );
};
