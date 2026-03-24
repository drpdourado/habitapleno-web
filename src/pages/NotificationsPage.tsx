import { useNotifications } from '../contexts/NotificationContext';
import { Bell, Check, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';

const NotificationsPage = () => {
    const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
    const navigate = useNavigate();

    const handleNotificationClick = async (notif: any) => {
        if (!notif.read) {
            await markAsRead(notif.id);
        }
        if (notif.link) {
            navigate(notif.link);
        }
    };

    return (
        <div className="w-full animate-in fade-in duration-500 pb-16">
            <HabitaContainer>
                <HabitaContainerHeader 
                    title="Painel de Notificações"
                    subtitle="Acompanhe seus comunicados, alertas e mensagens operacionais"
                    icon={<Bell size={24} />}
                    actions={
                        unreadCount > 0 && (
                            <HabitaButton
                                onClick={() => markAllAsRead()}
                                variant="outline"
                                className="text-indigo-600 border-indigo-100 bg-white hover:bg-indigo-50"
                                icon={<Check size={16} />}
                            >
                                Marcar Tudo Como Lido
                            </HabitaButton>
                        )
                    }
                />

                <HabitaContainerContent padding="none">
                    {notifications.length === 0 ? (
                        <div className="p-20 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 border border-slate-100">
                                <Bell className="text-slate-300" size={32} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Vazio Operacional</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Nenhuma notificação encontrada no histórico.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 flex flex-col">
                            {notifications.map((notif) => (
                                <button
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={clsx(
                                        "w-full text-left p-6 transition-all hover:bg-slate-50 group flex flex-col sm:flex-row sm:items-start gap-4",
                                        !notif.read ? "bg-indigo-50/30" : "bg-white"
                                    )}
                                >
                                    <div className={clsx(
                                        "mt-1.5 w-2 h-2 rounded-full shrink-0",
                                        !notif.read ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "bg-transparent"
                                    )}></div>

                                    <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                                        <div className="flex items-center justify-between gap-4">
                                            <h3 className={clsx(
                                                "font-black tracking-tight",
                                                !notif.read ? "text-slate-900" : "text-slate-700"
                                            )}>
                                                {notif.title}
                                            </h3>
                                            {notif.createdAt && (
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-black uppercase tracking-widest shrink-0 whitespace-nowrap hidden sm:flex">
                                                    <Clock size={12} className="text-indigo-400" />
                                                    {new Date(notif.createdAt).toLocaleString('pt-BR')}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-slate-600 text-sm leading-relaxed max-w-full font-medium">
                                            {notif.message}
                                        </p>

                                        {/* Mobile Date */}
                                        {notif.createdAt && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2 sm:hidden">
                                                <Clock size={12} className="text-indigo-400" />
                                                {new Date(notif.createdAt).toLocaleString('pt-BR')}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </HabitaContainerContent>
            </HabitaContainer>
        </div>
    );
};

export default NotificationsPage;
