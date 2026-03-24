import { useState, useRef, useEffect } from 'react';
import { Bell, Check, ArrowRight, BellRing } from 'lucide-react';
import { useNotifications, type AppNotification } from '../contexts/NotificationContext';
import { Link, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';

export const NotificationBell = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Fechar ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleNotificationClick = async (notif: AppNotification) => {
        if (!notif.read) {
            await markAsRead(notif.id);
        }
        setIsOpen(false);
        if (notif.link) {
            navigate(notif.link);
        }
    };

    const latestNotifications = notifications.slice(0, 5);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
            >
                {unreadCount > 0 ? (
                    <BellRing size={20} className="animate-pulse text-amber-500" />
                ) : (
                    <Bell size={20} />
                )}
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border border-slate-900">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Popover */}
            {isOpen && (
                <div className="absolute right-0 md:right-auto md:left-0 mt-2 w-80 bg-white rounded shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-sm">Notificações</span>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsRead()}
                                className="text-[10px] uppercase font-bold text-blue-600 hover:text-blue-700 tracking-wider flex items-center gap-1 transition-colors"
                            >
                                <Check size={12} />
                                Marcar todas
                            </button>
                        )}
                    </div>

                    <div className="max-h-[300px] overflow-y-auto w-full">
                        {latestNotifications.length === 0 ? (
                            <div className="p-6 text-center text-slate-500 text-sm">
                                Nenhuma notificação no momento.
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {latestNotifications.map((notif) => (
                                    <button
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={clsx(
                                            "w-full text-left p-4 border-b border-slate-100 transition-colors hover:bg-slate-50 relative",
                                            !notif.read && "bg-blue-50/50"
                                        )}
                                    >
                                        {!notif.read && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                                        )}
                                        <div className="flex flex-col gap-1 pr-2">
                                            <span className={clsx(
                                                "text-xs font-bold",
                                                !notif.read ? "text-slate-800" : "text-slate-600"
                                            )}>
                                                {notif.title}
                                            </span>
                                            <span className="text-[11px] text-slate-500 leading-tight">
                                                {notif.message}
                                            </span>
                                            {notif.createdAt && (
                                                <span className="text-[9px] font-medium text-slate-400 mt-1 uppercase">
                                                    {new Date(notif.createdAt).toLocaleString('pt-BR')}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-2 border-t border-slate-200 bg-slate-50">
                        <Link
                            to="/notificacoes"
                            onClick={() => setIsOpen(false)}
                            className="w-full py-2 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-slate-600 hover:text-blue-600 transition-colors rounded hover:bg-blue-50"
                        >
                            Ver Todas <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};
