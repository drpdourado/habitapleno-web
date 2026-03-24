import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  Menu, 
  X, 
  User as UserIcon,
  LogOut,
  Lock,
  ChevronDown
} from 'lucide-react';
import { HabitaHeading } from './HabitaHeading';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface HabitaNavigationItem {
  label: string;
  icon: React.ReactNode;
  to: string;
  badge?: string | number;
  onClick?: () => void;
  isBlocked?: boolean;
  end?: boolean;
  mobileOnly?: boolean;
  items?: HabitaNavigationItem[];
}

export interface HabitaNavigationGroup {
  title?: string;
  items: HabitaNavigationItem[];
}

export interface HabitaNavigationProps {
  groups: HabitaNavigationGroup[];
  footerItems?: HabitaNavigationItem[];
  user?: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout?: () => void;
  brand?: {
    prefix: string;
    suffix: string;
    logo?: React.ReactNode;
  };
  extraHeaderActions?: React.ReactNode;
  className?: string;
  variant?: 'clean' | 'dark';
  children?: React.ReactNode;
}

export const HabitaNavigation: React.FC<HabitaNavigationProps> = ({
  groups,
  footerItems = [],
  user,
  onLogout,
  brand,
  extraHeaderActions,
  className,
  variant = 'clean',
  children
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const location = useLocation();

  const isDark = variant === 'dark';

  const sidebarStyles = cn(
    "flex flex-col h-screen sticky top-0 shrink-0 z-[100] transition-all duration-300",
    isDark 
      ? "bg-slate-900 border-r border-slate-800 text-slate-300" 
      : "bg-white border-r border-slate-200 text-slate-600",
    "hidden md:flex w-[260px]",
    className
  );

  // Initialize and auto-open based on active route
  React.useEffect(() => {
    // Check each group for active children (visible items only for sidebar)
    groups.forEach((group, idx) => {
      const hasActiveChild = group.items.some(item => {
        // Skip mobile-only items for sidebar auto-open logic
        if (item.mobileOnly) return false;
        
        return item.end 
          ? location.pathname === item.to
          : location.pathname.startsWith(item.to);
      });

      if (hasActiveChild) {
        setExpandedIndex(idx);
      }
    });
  }, [groups, location.pathname]);

  const NavItem = ({ item, isMobile = false }: { item: HabitaNavigationItem; isMobile?: boolean }) => {
    return (
      <div className="relative">
        <NavLink
          to={item.isBlocked ? location.pathname : item.to}
          end={item.end}
          onClick={(e) => {
            if (item.isBlocked) {
              e.preventDefault();
              return;
            }
            if (item.onClick) item.onClick();
            if (isMobile) setIsMobileMenuOpen(false);
          }}
          className={({ isActive }) => cn(
            "group flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 relative",
            item.isBlocked ? "opacity-40 cursor-not-allowed" : (isActive
              ? (isDark ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700")
              : (isDark ? "hover:bg-slate-800 hover:text-white" : "hover:bg-slate-50 hover:text-slate-900")),
            isMobile && "py-3 text-base"
          )}
        >
          {({ isActive }) => (
            <>
              <span className={cn(
                "shrink-0 transition-colors",
                isActive && !item.isBlocked
                  ? (isDark ? "text-white" : "text-indigo-600") 
                  : (isDark ? "text-slate-500 group-hover:text-white" : "text-slate-400 group-hover:text-slate-600")
              )}>
                {React.cloneElement(item.icon as React.ReactElement<any>, { size: 20 })}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.isBlocked && (
                 <span className="text-slate-400"><Lock size={12} /></span>
              )}
              {item.badge && !item.isBlocked && (
                <span className={cn(
                  "text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[1.5rem] text-center",
                  isActive
                    ? (isDark ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700")
                    : (isDark ? "bg-slate-800 text-slate-400 group-hover:text-white" : "bg-slate-100 text-slate-500 group-hover:text-slate-700")
                )}>
                  {item.badge}
                </span>
              )}
            </>
          )}
        </NavLink>
      </div>
    );
  };

  const NavGroup = ({ group, isDark, isOpen, onToggle }: { group: HabitaNavigationGroup; isDark: boolean; isOpen: boolean; onToggle: () => void }) => {
    return (
      <div className="space-y-1">
        {group.title && (
          <button
            onClick={onToggle}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors",
              isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <span>{group.title}</span>
            <ChevronDown 
              size={12} 
              className={cn(
                "transition-transform duration-200",
                isOpen ? "rotate-180" : "rotate-0"
              )} 
            />
          </button>
        )}
        <div className={cn(
          "space-y-1 overflow-hidden transition-all duration-300",
          isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}>
          {group.items.filter(item => !item.mobileOnly).map((item, i) => (
            <NavItem key={i} item={item} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className={sidebarStyles}>
        {/* Brand Header */}
        <div className="p-6 pb-8 flex items-center justify-between gap-4">
          {brand && (
            <div className="border-l-4 border-indigo-600 pl-4 py-1">
              <NavLink to="/" className="flex flex-col">
                <span className={cn(
                  "text-xl font-bold tracking-tight leading-tight",
                  isDark ? "text-white" : "text-slate-900"
                )}>
                  {brand.prefix}
                </span>
                <span className={cn(
                  "text-lg font-light tracking-wide leading-tight",
                  isDark ? "text-slate-400" : "text-slate-500"
                )}>
                  {brand.suffix}
                </span>
              </NavLink>
            </div>
          )}
          {extraHeaderActions && (
             <div className="flex items-center gap-2">
               {extraHeaderActions}
             </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-6 custom-scrollbar pb-6">
          {groups.map((group, idx) => (
            <NavGroup 
              key={idx} 
              group={group} 
              isDark={isDark} 
              isOpen={expandedIndex === idx}
              onToggle={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
            />
          ))}
          {children && <div className="px-3">{children}</div>}
        </div>

        {footerItems.length > 0 && (
          <div className={cn(
            "p-3 border-t",
            isDark ? "border-slate-800" : "border-slate-100"
          )}>
            {footerItems.map((item, i) => (
              <NavItem key={i} item={item} />
            ))}
          </div>
        )}

        {user && (
          <div className={cn(
            "p-6 border-t",
            isDark ? "border-slate-800" : "border-slate-100"
          )}>
            <div className="flex items-center gap-3">
              <NavLink 
                to="/profile"
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 hover:ring-2 hover:ring-indigo-500/20 transition-all",
                  isDark ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-400"
                )}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full rounded-lg object-cover" />
                ) : (
                  <UserIcon size={20} />
                )}
              </NavLink>
              <NavLink 
                to="/profile"
                className="flex flex-col min-w-0 flex-1 hover:opacity-80 transition-opacity"
              >
                <span className={cn(
                  "text-xs font-bold truncate",
                  isDark ? "text-white" : "text-slate-900"
                )}>
                  {user.name}
                </span>
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest truncate">
                  {user.role}
                </span>
              </NavLink>
              <button 
                onClick={onLogout}
                className={cn(
                  "ml-auto p-2 rounded-md transition-colors",
                  isDark ? "hover:bg-slate-800 text-slate-500 hover:text-rose-400" : "hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                )}
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        )}
      </aside>

      <nav className={cn(
        "md:hidden fixed bottom-4 left-4 right-4 h-16 rounded-2xl border backdrop-blur-md z-[100] flex items-center justify-around px-2 shadow-2xl shadow-indigo-900/10",
        isDark 
          ? "bg-slate-900/90 border-slate-800 text-slate-300"
          : "bg-white/90 border-slate-200 text-slate-600"
      )}>
        {(() => {
          const allFlatItems = groups.flatMap(g => g.items);
          const primaryItems = allFlatItems.slice(0, 4);
          
          return (
            <>
              {primaryItems.map((item, i) => {
                return (
                  <NavLink
                    key={i}
                    to={item.to}
                    end={item.end}
                    className={({ isActive: linkActive }) => cn(
                      "flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-xl transition-all",
                      linkActive
                        ? (isDark ? "text-white" : "text-indigo-600")
                        : (isDark ? "text-slate-500" : "text-slate-400")
                    )}
                  >
                    {React.cloneElement(item.icon as React.ReactElement<any>, { size: 22 })}
                    <span className="text-[9px] font-black uppercase tracking-widest">{item.label.split(' ')[0]}</span>
                  </NavLink>
                );
              })}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1",
                  isDark ? "text-slate-500" : "text-slate-400"
                )}
              >
                <Menu size={22} />
                <span className="text-[9px] font-black uppercase tracking-widest">Menu</span>
              </button>
            </>
          );
        })()}
      </nav>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[1000] animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className={cn(
            "absolute bottom-0 left-0 right-0 max-h-[90vh] rounded-t-3xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-500",
            isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"
          )}>
            <div className="flex justify-center py-4">
              <div className={cn("w-12 h-1 rounded-full", isDark ? "bg-slate-800" : "bg-slate-200")} />
            </div>

            <div className="px-6 flex items-center justify-between mb-2">
              <HabitaHeading level={4}>{brand?.prefix || 'Menu'}</HabitaHeading>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn("p-2 rounded-full", isDark ? "bg-slate-800" : "bg-slate-100")}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-12 space-y-6 custom-scrollbar">
              {groups.map((group, idx) => (
                <div key={idx} className="space-y-2">
                  {group.title && (
                    <h3 className={cn(
                      "px-3 text-[10px] font-bold uppercase tracking-wider",
                      isDark ? "text-slate-500" : "text-slate-400"
                    )}>
                      {group.title}
                    </h3>
                  )}
                  <div className="space-y-1">
                    {group.items.map((item, i) => (
                      <NavItem key={i} item={item} isMobile />
                    ))}
                  </div>
                </div>
              ))}
              
              {children && <div className="mt-8">{children}</div>}
              
              {user && (
                <div className={cn(
                   "mt-8 p-4 rounded-2xl border",
                   isDark ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-100"
                )}>
                   <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold uppercase">
                        {user.avatar ? <img src={user.avatar} className="rounded-xl w-full h-full object-cover" /> : user.name.charAt(0)}
                      </div>
                      <NavLink 
                        to="/profile" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex flex-col flex-1 min-w-0"
                      >
                        <span className="font-bold truncate">{user.name}</span>
                        <span className="text-xs text-slate-500 font-medium truncate">{user.role}</span>
                      </NavLink>
                      <button 
                        onClick={onLogout}
                        className="ml-auto w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"
                      >
                        <LogOut size={20} />
                      </button>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
