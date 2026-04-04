import { useState, useEffect, useMemo, useRef } from 'react';
import {
    MessageSquare, Plus,
    Send, CheckCircle2,
    Inbox, ArrowRight, ArrowLeft,
    Search, User as UserIcon,
    Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useApp } from '../contexts/AppContext';
import { condoService, type ContactTicket } from '../services/CondoService';
import { hasPermission } from '../utils/rbac';

// Habita Design System
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { HabitaInput, HabitaSelect, HabitaTextarea } from '../components/ui/HabitaForm';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaSpinner } from '../components/ui/HabitaSpinner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const CATEGORIAS = [
    'Dúvida Geral',
    'Reclamação',
    'Sugestão',
    'Financeiro',
    'Cadastral',
    'Outros'
];

export function ContactPage() {
    const { profile, user, accessProfile } = useAuth();
    const { tenantId } = useApp();
    const { showToast } = useToast();
    
    // Check actual permission level instead of just admin/resident role
    const canSeeAllTickets = hasPermission(accessProfile, 'contact', 'all');

    // Data state
    const [tickets, setTickets] = useState<ContactTicket[]>([]);
    const [loading, setLoading] = useState(true);

    // UI state
    const [filter, setFilter] = useState<'Todos' | 'Aberto' | 'Respondido' | 'Fechado'>('Todos');
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<ContactTicket | null>(null);
    const [replyText, setReplyText] = useState('');
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Form state
    const [formData, setFormData] = useState({
        subject: '',
        category: CATEGORIAS[0]
    });

    const fetchTickets = () => {
        if (!tenantId) return;
        setLoading(true);
        condoService.listenTickets(
            (data) => {
                if (canSeeAllTickets) {
                    setTickets(data);
                } else {
                    setTickets(data.filter(t => t.authorId === user?.uid));
                }
                setSelectedTicket(prev => {
                    if (prev) {
                        const updated = data.find(t => t.id === prev.id);
                        return updated || prev;
                    }
                    return prev;
                });
                setLoading(false);
            },
            (err) => {
                console.error(err);
                if (err.message?.includes('permission-denied')) {
                     setTickets([]);
                }
                setLoading(false);
            }
        );
    };

    useEffect(() => {
        fetchTickets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tenantId, canSeeAllTickets, profile?.unitId, user?.uid]);

    useEffect(() => {
        // Auto-scroll to bottom of messages
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedTicket?.messages]);

    const filteredTickets = useMemo(() => {
        return tickets.filter(t => {
            if (filter !== 'Todos' && t.status !== filter) return false;
            if (search) {
                const s = search.toLowerCase();
                return t.subject.toLowerCase().includes(s) || 
                       t.category.toLowerCase().includes(s) ||
                       t.authorName.toLowerCase().includes(s) ||
                       t.unitId.toLowerCase().includes(s);
            }
            return true;
        });
    }, [tickets, filter, search]);

    const openModal = () => {
        setFormData({
            subject: '',
            category: CATEGORIAS[0]
        });
        setReplyText('');
        setIsModalOpen(true);
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.subject.trim() || !replyText.trim()) {
            showToast('Por favor, preencha o assunto e a primeira mensagem.', 'warning');
            return;
        }

        try {
            const resolvedUnitIds = profile?.unitId 
                ? String(profile.unitId) 
                : (profile?.vinculos && profile.vinculos.length > 0 
                    ? profile.vinculos.map((v: any) => v.unitId).filter(Boolean).join(', ') 
                    : 'N/A');

            const res = await condoService.createTicket({
                subject: formData.subject,
                category: formData.category,
                unitId: resolvedUnitIds,
                authorId: String(user?.uid),
                authorName: String(profile?.name || user?.email?.split('@')[0] || 'Desconhecido'),
                condominiumId: String(tenantId)
            }, String(tenantId));

            if (res.success && res.data) {
                // Now attach the first message
                const newTicketPseudo = {
                    id: res.data,
                    messages: []
                } as unknown as ContactTicket; // Minimal rep for reply

                await condoService.replyTicket(res.data, newTicketPseudo, {
                    authorId: String(user?.uid),
                    authorName: String(profile?.name || user?.email?.split('@')[0]),
                    text: replyText
                }, false, String(tenantId));

                showToast('Chamado aberto com sucesso!', 'success');
                setIsModalOpen(false);
                setReplyText('');
                fetchTickets();
            }
        } catch (error) {
            showToast('Erro ao abrir chamado.', 'error');
        }
    };

    const handleSendReply = async () => {
        if (!selectedTicket || !replyText.trim()) return;

        try {
            await condoService.replyTicket(
                selectedTicket.id, 
                selectedTicket, 
                {
                    authorId: String(user?.uid),
                    authorName: String(profile?.name || user?.email?.split('@')[0] || 'Administração'),
                    text: replyText
                }, 
                canSeeAllTickets, 
                String(tenantId)
            );
            setReplyText('');
            showToast('Mensagem enviada', 'success');
            fetchTickets();
        } catch (error) {
            showToast('Erro ao enviar mensagem', 'error');
        }
    };

    const handleUpdateStatus = async (newStatus: ContactTicket['status']) => {
        if (!selectedTicket) return;
        try {
            await condoService.updateTicketStatus(selectedTicket.id, selectedTicket, newStatus);
            showToast(`Status atualizado para ${newStatus}`, 'success');
            fetchTickets();
        } catch (error) {
            showToast('Erro ao atualizar status', 'error');
        }
    };

    const getStatusVariant = (status: string): "neutral" | "indigo" | "success" | "warning" | "error" | "outline" => {
        switch (status) {
            case 'Respondido':
                return 'indigo';
            case 'Fechado':
                return 'success';
            case 'Aberto':
                return 'warning';
            default:
                return 'neutral';
        }
    };

    return (
        <div className="w-full animate-in fade-in duration-500 pb-16">
            <HabitaContainer>
                <HabitaContainerHeader 
                    title="Fale com o Síndico"
                    subtitle="Gestão de chamados e solicitações corporativas"
                    icon={<MessageSquare size={24} />}
                    actions={
                        !canSeeAllTickets && (
                            <HabitaButton
                                onClick={openModal}
                                variant="primary"
                                icon={<Plus size={18} />}
                                className="bg-slate-900 border-slate-900 shadow-lg shadow-slate-200"
                            >
                                Novo Chamado
                            </HabitaButton>
                        )
                    }
                />

                <HabitaContainerContent padding="none">
                    <div className="flex flex-1 overflow-hidden h-[calc(100vh-16rem)] min-h-[500px]">
                    {/* Left Column - List */}
                    <div className={cn(
                        "w-full md:w-80 lg:w-96 flex flex-col h-full bg-slate-50/30 border-r border-slate-100 shrink-0 overflow-hidden",
                        selectedTicket ? "hidden md:flex" : "flex"
                    )}>
                        <div className="p-4 md:p-6 pb-2 space-y-4 shrink-0">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors z-10" size={14} />
                                <HabitaInput
                                    placeholder="Buscar por assunto, categoria..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 h-9 text-[11px] bg-white border-slate-200 shadow-sm"
                                    containerClassName="w-full"
                                />
                            </div>

                            <div className="flex flex-wrap gap-1.5 overflow-x-auto no-scrollbar pb-1">
                                {(['Todos', 'Aberto', 'Respondido', 'Fechado'] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setFilter(t)}
                                        className={cn(
                                            "flex-none px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                                            filter === t
                                                ? "bg-slate-800 text-white border-slate-800 shadow-md shadow-slate-200"
                                                : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                                        )}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3 custom-scrollbar">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <HabitaSpinner size="md" showLabel label="Sincronizando Inbox..." />
                                </div>
                            ) : filteredTickets.length === 0 ? (
                                <div className="text-center py-20 px-8">
                                    <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-200 border-dashed">
                                        <Inbox size={24} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhuma conversa iniciada</p>
                                </div>
                            ) : (
                                filteredTickets.map((ticket) => (
                                    <div
                                        key={ticket.id}
                                        onClick={() => setSelectedTicket(ticket)}
                                        className={cn(
                                            "p-4 rounded-2xl border cursor-pointer transition-all relative overflow-hidden group",
                                            selectedTicket?.id === ticket.id
                                                ? "bg-white border-indigo-400 shadow-md ring-1 ring-indigo-400/20 translate-x-1"
                                                : "bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50/50"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <HabitaBadge variant={getStatusVariant(ticket.status)} size="xs">
                                                {ticket.status.toUpperCase()}
                                            </HabitaBadge>
                                            <div className="flex items-center gap-1.5 text-slate-400">
                                                <Clock size={10} />
                                                <span className="text-[9px] font-bold uppercase tracking-widest">
                                                    {new Date(ticket.updatedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <h3 className={cn(
                                            "text-xs font-black tracking-tight leading-snug mb-3 uppercase",
                                            selectedTicket?.id === ticket.id ? "text-indigo-900" : "text-slate-800"
                                        )}>
                                            {ticket.subject}
                                        </h3>
                                        
                                        <div className="flex items-center justify-between text-slate-500 pt-3 border-t border-slate-50">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                    <UserIcon size={10} className="text-slate-400" />
                                                </div>
                                                <span className="text-[9px] font-bold uppercase tracking-widest truncate">
                                                     {canSeeAllTickets ? `${ticket.authorName} (${ticket.unitId})` : ticket.category}
                                                </span>
                                            </div>
                                            <HabitaBadge variant="neutral" size="xs" className="shrink-0 bg-slate-50 border-slate-100">
                                                {ticket.messages?.length || 0} MSGS
                                            </HabitaBadge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Column - Chat Area */}
                    <div className={cn(
                        "flex-1 flex flex-col h-full bg-white relative overflow-hidden",
                        !selectedTicket ? "hidden md:flex" : "flex"
                    )}>
                        {!selectedTicket ? (
                            <div className="h-full flex items-center justify-center bg-slate-50/20">
                                <div className="text-center opacity-40 max-w-sm px-10">
                                    <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl border border-slate-100 flex items-center justify-center mx-auto mb-8 transform -rotate-6">
                                        <MessageSquare size={48} className="text-indigo-500" />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-400 uppercase tracking-tight mb-2 italic">Inbox Vazio</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                        Selecione uma conversa ao lado para visualizar o histórico de mensagens e responder ao chamado.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <header className="px-5 md:px-8 py-4 border-b border-slate-100 bg-white shrink-0 flex justify-between items-center z-20 shadow-sm">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <button
                                            onClick={() => setSelectedTicket(null)}
                                            className="md:hidden p-2 -ml-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                        >
                                            <ArrowLeft size={20} />
                                        </button>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <HabitaBadge variant="indigo" size="xs" className="px-2 py-0.5 bg-indigo-50 border-indigo-100 font-black">
                                                    {(selectedTicket.category || 'CHAMADO').toUpperCase()}
                                                </HabitaBadge>
                                                {canSeeAllTickets && (
                                                    <HabitaBadge variant="neutral" size="xs" className="font-black">
                                                        Unidade {selectedTicket.unitId || 'N/A'}
                                                    </HabitaBadge>
                                                )}
                                                <HabitaBadge variant={getStatusVariant(selectedTicket.status)} size="xs" className="font-black">
                                                    {(selectedTicket.status || 'ABERTO').toUpperCase()}
                                                </HabitaBadge>
                                            </div>
                                            <h2 className="text-base md:text-lg font-black text-slate-800 tracking-tight leading-snug truncate uppercase">
                                                {selectedTicket.subject}
                                            </h2>
                                        </div>
                                    </div>

                                    {/* Status controls */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {canSeeAllTickets && selectedTicket.status !== 'Fechado' && (
                                            <HabitaButton 
                                                onClick={() => handleUpdateStatus('Fechado')}
                                                variant="outline"
                                                size="sm"
                                                className="text-[9px] font-black uppercase text-emerald-600 border-emerald-100 hover:bg-emerald-50 h-8"
                                                icon={<CheckCircle2 size={12} />}
                                            >
                                                Resolver
                                            </HabitaButton>
                                        )}
                                        {canSeeAllTickets && selectedTicket.status === 'Fechado' && (
                                            <HabitaButton 
                                                onClick={() => handleUpdateStatus('Aberto')}
                                                variant="outline"
                                                size="sm"
                                                className="text-[9px] font-black uppercase text-amber-600 border-amber-100 hover:bg-amber-50 h-8"
                                                icon={<Clock size={12} />}
                                            >
                                                Reabrir
                                            </HabitaButton>
                                        )}
                                    </div>
                                </header>

                                {/* Messages Flow */}
                                <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-slate-50/50 space-y-8 custom-scrollbar">
                                    {(selectedTicket.messages || []).map((msg, i) => {
                                        const isMe = msg.authorId === user?.uid;
                                        const authorName = msg.authorName || (isMe ? profile?.name || user?.email?.split('@')[0] : 'Administração');
                                        const isSystem = authorName === 'Administração' || authorName.includes('Admin') || authorName.includes('Sindico');
                                        
                                        return (
                                            <div key={msg.id || i} className={cn(
                                                "flex w-full animate-in slide-in-from-bottom-2 duration-300",
                                                isMe ? "justify-end" : "justify-start"
                                            )}>
                                                <div className={cn(
                                                    "max-w-[85%] md:max-w-[70%] group relative",
                                                    isMe ? "items-end" : "items-start"
                                                )}>
                                                    <div className={cn(
                                                        "p-4 md:p-5 shadow-sm transition-all",
                                                        isMe 
                                                            ? "bg-slate-900 text-white rounded-[1.5rem] rounded-tr-none shadow-slate-200" 
                                                            : (isSystem 
                                                                ? "bg-white border border-indigo-100 text-slate-700 rounded-[1.5rem] rounded-tl-none" 
                                                                : "bg-white border border-slate-200 text-slate-700 rounded-[1.5rem] rounded-tl-none")
                                                    )}>
                                                        <div className="flex justify-between items-baseline mb-2 gap-6">
                                                            <span className={cn(
                                                                "text-[9px] font-black uppercase tracking-[0.1em]",
                                                                isMe 
                                                                    ? "text-slate-400" 
                                                                    : (isSystem ? "text-indigo-600" : "text-slate-500")
                                                            )}>
                                                                {isMe ? 'Minha Mensagem' : authorName}
                                                            </span>
                                                            <span className={cn(
                                                                "text-[8px] font-bold uppercase tracking-widest shrink-0",
                                                                isMe ? "text-slate-500" : "text-slate-300"
                                                            )}>
                                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <div className="text-[13px] md:text-sm leading-relaxed font-medium whitespace-pre-wrap">
                                                            {msg.text}
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "mt-1.5 flex items-center gap-2 px-2",
                                                        isMe ? "justify-end" : "justify-start"
                                                    )}>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                                            {new Date(msg.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area */}
                                <div className="p-4 md:p-6 bg-white border-t border-slate-100 shrink-0">
                                    {selectedTicket.status === 'Fechado' ? (
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed text-center">
                                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                                Este chamado está fechado e não aceita novas interações
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex gap-4 items-end max-w-5xl mx-auto">
                                            <div className="flex-1 relative group">
                                                <textarea
                                                    rows={1}
                                                    value={replyText}
                                                    onChange={(e) => {
                                                        setReplyText(e.target.value);
                                                        e.target.style.height = 'auto';
                                                        e.target.style.height = (e.target.scrollHeight) + 'px';
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleSendReply();
                                                            e.currentTarget.style.height = 'auto';
                                                        }
                                                    }}
                                                    placeholder="Escreva sua mensagem operacional..."
                                                    className="w-full min-h-[52px] max-h-32 px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 focus:bg-white outline-none transition-all resize-none text-[13px] font-medium text-slate-700 custom-scrollbar"
                                                />
                                            </div>
                                            <HabitaButton
                                                onClick={handleSendReply}
                                                disabled={!replyText.trim()}
                                                icon={<Send size={16} />}
                                                className="h-[52px] px-6 bg-slate-900 border-slate-900 shadow-xl shadow-slate-100 hover:bg-slate-800 shrink-0 rounded-2xl"
                                            >
                                                <span className="hidden sm:inline">Responder</span>
                                            </HabitaButton>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                    </div>
                </HabitaContainerContent>
            </HabitaContainer>

            {/* Modal de Novo Chamado */}
            <HabitaModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Abrir Novo Chamado"
                size="md"
            >
                <form onSubmit={handleCreateTicket} className="space-y-6">
                    <HabitaInput
                        label="Assunto Principal"
                        required
                        value={formData.subject}
                        onChange={e => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="Ex: Vazamento no corredor"
                        className="font-bold text-slate-800 uppercase tracking-tight"
                    />

                    <HabitaSelect
                        label="Categoria"
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="font-bold text-slate-800 uppercase tracking-tight"
                    >
                        {CATEGORIAS.map(cat => (
                            <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                        ))}
                    </HabitaSelect>

                    <HabitaTextarea
                        label="Descrição da Solicitação"
                        required
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Descreva detalhadamente o que deseja reportar ou solicitar..."
                        className="font-medium text-slate-700"
                    />

                    <div className="pt-4 flex gap-4">
                        <HabitaButton variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">
                            Cancelar
                        </HabitaButton>
                        <HabitaButton 
                            type="submit" 
                            variant="primary" 
                            className="flex-[2] bg-indigo-600 border-indigo-600"
                            icon={<ArrowRight size={18} />}
                        >
                            Protocolar Chamado
                        </HabitaButton>
                    </div>
                </form>
            </HabitaModal>
        </div>
    );
}

export default ContactPage;
