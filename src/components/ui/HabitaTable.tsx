import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface HabitaTableProps {
  children?: React.ReactNode;
  headers?: string[];
  data?: React.ReactNode[][];
  className?: string;
  containerClassName?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  responsive?: boolean;
  mobileVariant?: 'card' | 'list';
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const HabitaTable: React.FC<HabitaTableProps> = ({ 
  children, 
  headers, 
  data, 
  className, 
  containerClassName,
  isEmpty,
  emptyMessage,
  responsive = false,
  mobileVariant = 'card'
}) => (
  <div className={cn(
    "w-full overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm", 
    (responsive && mobileVariant === 'card') && "bg-transparent border-none shadow-none md:bg-white md:border md:border-slate-200 md:shadow-sm",
    containerClassName
  )}>
    <div className={cn("overflow-x-auto", responsive && "md:overflow-x-auto overflow-x-visible")}>
      <table className={cn(
        "w-full text-left text-slate-700", 
        responsive && "block md:table",
        className
      )}>
        {isEmpty ? (
          <tbody className={cn(responsive && "block md:table-row-group")}>
            <tr className={cn(responsive && "block md:table-row")}>
              <td colSpan={headers?.length || 1} className="py-12 text-center text-slate-400 text-sm font-medium italic">
                {emptyMessage || "Nenhum registro encontrado."}
              </td>
            </tr>
          </tbody>
        ) : (
          children ? (
            <HabitaTableContext.Provider value={{ responsive, mobileVariant }}>
              {children}
            </HabitaTableContext.Provider>
          ) : (
            <>
              {headers && (
                <HabitaTHead responsive={responsive}>
                  <HabitaTR responsive={responsive}>
                    {headers.map((header, i) => (
                      <HabitaTH key={i} responsive={responsive}>{header}</HabitaTH>
                    ))}
                  </HabitaTR>
                </HabitaTHead>
              )}
              {data && (
                <HabitaTBody responsive={responsive}>
                  {data.map((row, i) => (
                    <HabitaTR key={i} responsive={responsive}>
                      {row.map((cell, j) => (
                        <HabitaTD 
                          key={j} 
                          responsive={responsive} 
                          label={headers ? headers[j] : undefined}
                        >
                          {cell}
                        </HabitaTD>
                      ))}
                    </HabitaTR>
                  ))}
                </HabitaTBody>
              )}
            </>
          )
        )}
      </table>
    </div>
  </div>
);

const HabitaTableContext = React.createContext<{ responsive: boolean; mobileVariant: 'card' | 'list' }>({ responsive: false, mobileVariant: 'card' });

export const HabitaTHead: React.FC<{ children: React.ReactNode; className?: string; responsive?: boolean }> = ({ children, className, responsive: propsResponsive }) => {
  const { responsive: contextResponsive } = React.useContext(HabitaTableContext);
  const responsive = propsResponsive ?? contextResponsive;
  return (
    <thead className={cn(
      "bg-slate-50/50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider leading-tight",
      responsive && "hidden md:table-header-group",
      className
    )}>
      {children}
    </thead>
  );
};

export const HabitaTBody: React.FC<{ children: React.ReactNode; className?: string; responsive?: boolean }> = ({ children, className, responsive: propsResponsive }) => {
  const { responsive: contextResponsive, mobileVariant } = React.useContext(HabitaTableContext);
  const responsive = propsResponsive ?? contextResponsive;
  return (
    <tbody className={cn(
        "divide-y divide-slate-200", 
        (responsive && mobileVariant === 'card') && "block md:table-row-group md:divide-y space-y-3 md:space-y-0", 
        (responsive && mobileVariant === 'list') && "block md:table-row-group md:divide-y divide-slate-200",
        className
    )}>
      {children}
    </tbody>
  );
};

export const HabitaTR: React.FC<React.HTMLAttributes<HTMLTableRowElement> & { responsive?: boolean }> = ({ children, className, responsive: propsResponsive, ...props }) => {
  const { responsive: contextResponsive, mobileVariant } = React.useContext(HabitaTableContext);
  const responsive = propsResponsive ?? contextResponsive;
  return (
    <tr className={cn(
      "hover:bg-slate-50/50 transition-colors group", 
      (responsive && mobileVariant === 'card') && "block md:table-row bg-white rounded-2xl border border-slate-200 mb-3 md:mb-0 md:bg-transparent md:border-none shadow-sm md:shadow-none p-4 md:p-0",
      (responsive && mobileVariant === 'list') && "block md:table-row bg-transparent md:bg-transparent border-b border-slate-100 last:border-none md:border-none px-4 py-3 md:p-0",
      className
    )} {...props}>
      {children}
    </tr>
  );
};

export const HabitaTH: React.FC<React.ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'center' | 'right'; responsive?: boolean }> = ({ children, className, align = 'left', responsive: propsResponsive, ...props }) => {
  const alignment = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };
  const { responsive: contextResponsive } = React.useContext(HabitaTableContext);
  const responsive = propsResponsive ?? contextResponsive;
  return (
    <th className={cn(
      "px-3 py-1 md:py-2 font-bold", 
      alignment[align], 
      responsive && "md:table-cell",
      className
    )} {...props}>
      {children}
    </th>
  );
};

export const HabitaTD: React.FC<React.TdHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'center' | 'right'; label?: string; responsive?: boolean }> = ({ 
  children, 
  className, 
  align = 'left', 
  label,
  responsive: propsResponsive,
  ...props 
}) => {
  const alignment = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };
  const { responsive: contextResponsive } = React.useContext(HabitaTableContext);
  const responsive = propsResponsive ?? contextResponsive;

  return (
    <td className={cn(
      "px-4 py-3 font-normal text-sm text-slate-800 leading-tight", 
      alignment[align], 
      responsive && "flex justify-between items-center md:table-cell py-1.5 md:py-3 border-none md:border-none",
      className
    )} {...props}>
      {responsive && label && (
        <span className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      )}
      <div className={cn(responsive && "md:contents")}>
        {children}
      </div>
    </td>
  );
};

