import { useState, useEffect } from 'react';
import { MessageSquareMore } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { condoService } from '../services/CondoService';
import { hasPermission } from '../utils/rbac';

export const ContactShortcut = () => {
    const [hasUnread, setHasUnread] = useState(false);
    const { user, accessProfile } = useAuth();
    const { tenantId } = useApp();

    const canSeeAllTickets = hasPermission(accessProfile, 'contact', 'all');

    useEffect(() => {
        if (!tenantId || !user) return;

        const unsubscribe = condoService.listenTickets(
            (data) => {
                if (canSeeAllTickets) {
                    // Admin/Síndico: Alerta se houver tickets 'Aberto'
                    const hasOpen = data.some(t => t.status === 'Aberto');
                    setHasUnread(hasOpen);
                } else {
                    // Morador: Alerta se houver tickets 'Respondido'
                    const myTickets = data.filter(t => t.authorId === user.uid);
                    const hasAnswered = myTickets.some(t => {
                        // Notificar se o status mudou para algo que requer atenção (Respondido/Fechado)
                        // OU se a última mensagem não foi enviada pelo morador
                        if (t.status === 'Respondido' || t.status === 'Fechado') {
                            if (t.messages && t.messages.length > 0) {
                                return t.messages[t.messages.length - 1].authorId !== user.uid;
                            }
                            return true;
                        }
                        if (t.status === 'Aberto' && t.messages && t.messages.length > 0) {
                            return t.messages[t.messages.length - 1].authorId !== user.uid;
                        }
                        return false;
                    });
                    setHasUnread(hasAnswered);
                }
            },
            () => {
                // Ignore erros de permissão ou rede silenciosamente no badge
            }
        );

        return () => unsubscribe();
    }, [tenantId, user, canSeeAllTickets]);

    return (
        <Link
            to="/fale-conosco"
            title="Fale com a Administração"
            className="relative p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none flex items-center justify-center"
        >
            <MessageSquareMore size={20} />
            {hasUnread && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
            )}
        </Link>
    );
};
