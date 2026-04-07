import { useState, useMemo } from 'react';
import { useApp, type MuralNotice } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
    Megaphone, Plus, Trash2, Pencil,
    User, X, Bell, Check,
    Eye, Info, AlertTriangle, PartyPopper
} from 'lucide-react';
import { clsx } from 'clsx';
import { condoService } from '../services/CondoService';

// Habita Design System
import { HabitaCard, HabitaCardContent, HabitaCardFooter } from '../components/ui/HabitaCard';
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaInput, HabitaTextarea } from '../components/ui/HabitaForm';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaDatePicker } from '../components/ui/HabitaDatePicker';
import { HabitaIconActionButton } from '../components/ui/HabitaIconActionButton';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { HabitaSpinner } from '../components/ui/HabitaSpinner';
import { HabitaHeading } from '../components/ui/HabitaHeading';

export function MuralPage() {
    const { tenantId, notices, addNotice, updateNotice, deleteNotice, markNoticeAsRead, isLoading } = useApp();
    const { isAdmin, profile, user } = useAuth();
    const { showToast } = useToast();

    const canManageNotices = isAdmin;
    const canCreateNotices = true; // Todos podem propor, moradores ficam pendentes

    // UI state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNotice, setEditingNotice] = useState<MuralNotice | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [type, setType] = useState<'urgent' | 'info' | 'event'>('info');
    const [expiryDate, setExpiryDate] = useState('');

    const [selectedNotice, setSelectedNotice] = useState<MuralNotice | null>(null);
    const [showReadByModal, setShowReadByModal] = useState<MuralNotice | null>(null);

    const visibleNotices = useMemo(() => {
        if (isAdmin || canManageNotices) return notices;
        const now = new Date();
        return notices.filter((n: MuralNotice) => {
            const isApproved = n.status === 'approved' || !n.status;
            const isMyPendingOrRejected = (n.status === 'pending' || n.status === 'rejected') && n.authorId === user?.uid;
            const isNotExpired = !n.expiryDate || new Date(n.expiryDate) >= now;
            return (isApproved || isMyPendingOrRejected) && isNotExpired;
        });
    }, [notices, isAdmin, canManageNotices, user]);

    const openModal = (notice?: MuralNotice) => {
        if (notice) {
            setEditingNotice(notice);
            setTitle(notice.title);
            setContent(notice.content);
            setPriority(notice.priority);
            setType(notice.type);
            setExpiryDate(notice.expiryDate || '');
        } else {
            setEditingNotice(null);
            setTitle('');
            setContent('');
            setPriority('medium');
            setType('info');
            setExpiryDate('');
        }
        setIsModalOpen(true);
    };

    const handleOpenDetail = async (notice: MuralNotice) => {
        setSelectedNotice(notice);
        const uId = String(profile?.unitId).trim();
        const hasRead = (notice.readBy || []).map(id => String(id).trim()).includes(uId);
        if (!isAdmin && profile?.unitId && !hasRead) {
            await markNoticeAsRead(notice.id, profile.unitId);
        }
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!title.trim() || !content.trim()) {
            showToast('Por favor, preencha o título e o conteúdo.', 'warning');
            return;
        }

        setIsSaving(true);
        try {
            if (editingNotice) {
                const updated = {
                    ...editingNotice,
                    title,
                    content,
                    priority,
                    type,
                    expiryDate: expiryDate || null,
                    date: new Date().toISOString()
                };
                await updateNotice(updated);
                showToast('Aviso atualizado com sucesso!', 'success');
            } else {
                const status = isAdmin ? 'approved' : 'pending';
                const newNotice: MuralNotice = {
                    id: crypto.randomUUID(),
                    title,
                    content,
                    priority,
                    type,
                    expiryDate: expiryDate || null,
                    authorName: profile?.name || 'Administração',
                    authorId: user?.uid || 'admin',
                    date: new Date().toISOString(),
                    readBy: [],
                    isArchived: false,
                    status
                };
                await addNotice(newNotice);
                
                if (status === 'pending') {
                    showToast('Comunicado enviado para moderação.', 'success');
                } else {
                    showToast('Aviso publicado no mural!', 'success');
                }
            }
            setIsModalOpen(false);
        } catch (error) {
            showToast('Erro ao salvar o aviso.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!isDeleting) return;
        setIsSaving(true);
        try {
            await deleteNotice(isDeleting);
            showToast('Aviso removido.', 'info');
        } catch (error) {
            showToast('Erro ao remover aviso.', 'error');
        } finally {
            setIsDeleting(null);
            setIsSaving(false);
        }
    };

    const handleApprove = async (notice: MuralNotice) => {
        try {
            await condoService.approveNotice(notice, tenantId);
            await updateNotice({ ...notice, status: 'approved' });
            showToast('Postagem aprovada!', 'success');
        } catch (error) {
            showToast('Erro ao aprovar postagem.', 'error');
        }
    };

    const handleReject = async (notice: MuralNotice) => {
        try {
            await condoService.rejectNotice(notice, tenantId);
            await updateNotice({ ...notice, status: 'rejected' });
            showToast('Postagem rejeitada.', 'info');
        } catch (error) {
            showToast('Erro ao rejeitar postagem.', 'error');
        }
    };

    const getTypeLabel = (t: string) => {
        switch (t) {
            case 'urgent': return 'Urgente';
            case 'event': return 'Evento';
            default: return 'Informativo';
        }
    };

    const getTypeIcon = (t: string) => {
        switch (t) {
            case 'urgent': return <AlertTriangle size={14} />;
            case 'event': return <PartyPopper size={14} />;
            default: return <Info size={14} />;
        }
    };

    if (isLoading) {
        return (
            <div className="w-full flex items-center justify-center min-h-[60vh]">
                <HabitaSpinner size="lg" showLabel label="Carregando Mural..." />
            </div>
        );
    }

    return (
        <div className="w-full animate-in fade-in duration-700 pb-16">
            <HabitaContainer>
                <HabitaContainerHeader
                    title="Mural de Avisos"
                    subtitle="Comunicados Oficiais e Informativos do Condomínio"
                    icon={<Megaphone size={18} />}
                    actions={
                        canCreateNotices && (
                            <HabitaButton
                                onClick={() => openModal()}
                                variant="primary"
                                icon={<Plus size={18} />}
                                className="bg-indigo-600 border-indigo-600 hover:bg-indigo-700 hover:scale-105"
                            >
                                Novo Comunicado
                            </HabitaButton>
                        )
                    }
                />

                <HabitaContainerContent padding="md" className="overflow-visible">
                    {/* Empty State */}
                    {visibleNotices.length === 0 ? (
                        <div className="bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 p-20 flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                                <Bell size={40} className="text-slate-200" />
                            </div>
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Nenhum comunicado no momento</h3>
                            <p className="text-xs text-slate-300 font-medium mt-2 max-w-sm">
                                {isAdmin ? "Publique o primeiro aviso para manter os moradores informados." : "O mural está vazio. Assim que a administração postar novos avisos, eles aparecerão aqui."}
                            </p>
                        </div>
                    ) : (
                        /* Notices Grid */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                            {visibleNotices.map((notice: MuralNotice) => (
                                <HabitaCard
                                    key={notice.id}
                                    onClick={() => !isAdmin && handleOpenDetail(notice)}
                                    padding="none"
                                    className={clsx(
                                        "group flex flex-col h-full hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-50 transition-all duration-300 cursor-pointer overflow-hidden",
                                        !isAdmin && profile?.unitId && !(notice.readBy || []).map(id => String(id).trim()).includes(String(profile.unitId).trim()) 
                                            ? "border-indigo-200 bg-indigo-50/10" 
                                            : "border-slate-100",
                                        (canManageNotices || notice.authorId === user?.uid) && notice.status === 'pending' && "border-amber-200 bg-amber-50/10"
                                    )}
                                >
                                    <HabitaCardContent padding="md" className="flex-1">
                                        {/* Status & Actions Header */}
                                        <div className="flex items-center justify-between mb-5">
                                            <div className="flex gap-2">
                                                <HabitaBadge 
                                                    variant={notice.type === 'urgent' ? 'error' : notice.type === 'event' ? 'success' : 'indigo'}
                                                    size="xs"
                                                    className="font-black"
                                                >
                                                    {getTypeLabel(notice.type).toUpperCase()}
                                                </HabitaBadge>
                                                {notice.status === 'pending' && (
                                                    <HabitaBadge variant="warning" size="xs" className="font-black">MODERAÇÃO</HabitaBadge>
                                                )}
                                                {notice.status === 'rejected' && (
                                                    <HabitaBadge variant="error" size="xs" className="font-black">REJEITADO</HabitaBadge>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                {(canManageNotices || notice.authorId === user?.uid) && (
                                                    <HabitaIconActionButton
                                                        icon={<Pencil />}
                                                        variant="ghost"
                                                        size="sm"
                                                        tooltip="Editar"
                                                        className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openModal(notice);
                                                        }}
                                                    />
                                                )}
                                                {(canManageNotices || notice.authorId === user?.uid) && (
                                                    <HabitaIconActionButton
                                                        icon={<Trash2 />}
                                                        variant="ghost"
                                                        size="sm"
                                                        tooltip="Excluir"
                                                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsDeleting(notice.id);
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Content Area */}
                                        <div className="space-y-3">
                                            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
                                                {notice.title}
                                            </h3>
                                            <p className="text-slate-500 text-xs leading-relaxed font-medium line-clamp-3">
                                                {notice.content}
                                            </p>
                                        </div>
                                    </HabitaCardContent>

                                    {/* Approval Actions (Admin) */}
                                    {canManageNotices && notice.status === 'pending' && (
                                        <div className="px-5 pb-5 flex gap-2">
                                            <HabitaButton 
                                                onClick={(e) => { e.stopPropagation(); handleApprove(notice); }}
                                                className="flex-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border-emerald-100 h-9"
                                                size="sm"
                                                icon={<Check size={14} />}
                                            >
                                                Aprovar
                                            </HabitaButton>
                                            <HabitaButton 
                                                onClick={(e) => { e.stopPropagation(); handleReject(notice); }}
                                                className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border-rose-100 h-9"
                                                size="sm"
                                                icon={<X size={14} />}
                                            >
                                                Rejeitar
                                            </HabitaButton>
                                        </div>
                                    )}

                                    {/* Card Footer with Meta Info */}
                                    <HabitaCardFooter className="px-5 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between mt-auto">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm">
                                                <User size={14} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-700 uppercase leading-none truncate max-w-[100px]">{notice.authorName}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">
                                                    {new Date(notice.date).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        {isAdmin && (
                                            <HabitaButton 
                                                onClick={(e) => { e.stopPropagation(); setShowReadByModal(notice); }}
                                                variant="outline"
                                                size="sm"
                                                className="h-7 px-2 gap-1.5 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 bg-white"
                                            >
                                                <Eye size={12} className="transition-transform group-hover:scale-110" />
                                                <span className="text-[10px]">{notice.readBy.length}</span>
                                            </HabitaButton>
                                        )}
                                    </HabitaCardFooter>
                                </HabitaCard>
                            ))}
                        </div>
                    )}
                </HabitaContainerContent>
            </HabitaContainer>

            {/* Modal: Read By List (Admin Only) */}
            <HabitaModal
                isOpen={!!showReadByModal}
                onClose={() => setShowReadByModal(null)}
                title="Status de Visualização"
                size="sm"
                footer={
                    <HabitaButton onClick={() => setShowReadByModal(null)} variant="outline" className="w-full h-11 uppercase font-black tracking-widest text-[10px]">
                        Fechar Controle
                    </HabitaButton>
                }
            >
                <div className="space-y-6">
                    <div className="flex items-center gap-4 text-emerald-600 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-600 shrink-0">
                            <Eye size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black uppercase tracking-widest">{showReadByModal?.readBy.length} Visualizações</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Unidade que acessaram este aviso</span>
                        </div>
                    </div>

                    {showReadByModal?.readBy.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                                <Bell size={24} />
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhuma visualização registrada ainda.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                            {showReadByModal?.readBy.sort((a: string, b: string) => a.localeCompare(b)).map((unitId: string) => (
                                <div key={unitId} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center shadow-sm hover:scale-105 transition-transform">
                                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter">UN {unitId}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </HabitaModal>

            {/* Modal: Notice Details (Resident) */}
            <HabitaModal
                isOpen={!!selectedNotice}
                onClose={() => setSelectedNotice(null)}
                title={selectedNotice?.title || 'Detalhes do Comunicado'}
                size="md"
                footer={
                    <HabitaButton onClick={() => setSelectedNotice(null)} variant="primary" className="w-full h-12 uppercase font-black tracking-[0.2em] text-[10px]">
                        Confirmar Leitura
                    </HabitaButton>
                }
            >
                {selectedNotice && (
                    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <HabitaBadge 
                                variant={selectedNotice.type === 'urgent' ? 'error' : selectedNotice.type === 'event' ? 'success' : 'indigo'}
                                size="sm"
                                className="font-black px-4"
                            >
                                {getTypeLabel(selectedNotice.type).toUpperCase()}
                            </HabitaBadge>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Postado em</span>
                                <span className="text-sm font-black text-slate-800 mt-1 uppercase tracking-tighter">
                                    {new Date(selectedNotice.date).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-slate-600 text-lg leading-relaxed font-medium whitespace-pre-wrap relative">
                             <div className="absolute top-4 left-4 text-slate-100 opacity-20"><Info size={40} /></div>
                            {selectedNotice.content}
                        </div>

                        <div className="flex items-center gap-4 p-4 border-t border-slate-100">
                            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-inner">
                                <User size={24} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase leading-none tracking-widest">Publicado por</span>
                                <span className="text-base font-black text-slate-800 mt-1 uppercase tracking-tight">{selectedNotice.authorName}</span>
                            </div>
                        </div>
                    </div>
                )}
            </HabitaModal>

            {/* Modal: Create/Edit Form */}
            <HabitaModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingNotice ? 'Editar Comunicado' : 'Novo Comunicado'}
                size="lg"
                footer={(
                    <div className="flex gap-4 w-full">
                        <HabitaButton variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-11 uppercase font-bold tracking-widest text-[10px]">Descartar</HabitaButton>
                        <HabitaButton 
                            onClick={() => handleSave()} 
                            variant="primary" 
                            isLoading={isSaving}
                            className="flex-[2] h-11 bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100"
                        >
                            {editingNotice ? 'Efetivar Alterações' : 'Publicar Agora'}
                        </HabitaButton>
                    </div>
                )}
            >
                <form className="space-y-10 pb-4">
                    <div className="space-y-6">
                        <HabitaHeading
                            level={4}
                            icon={<div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 shadow-sm"><Info size={18} /></div>}
                        >
                            Conteúdo do Comunicado
                        </HabitaHeading>
                        
                        <HabitaInput
                            label="Título do Aviso"
                            value={title}
                            onChange={(e: any) => setTitle(e.target.value)}
                            placeholder="Ex: Manutenção da Piscina"
                            required
                        />

                        <HabitaTextarea
                            label="Mensagem Detalhada"
                            value={content}
                            onChange={(e: any) => setContent(e.target.value)}
                            placeholder="Informe aqui todos os detalhes pertinentes..."
                            rows={8}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <HabitaHeading
                                level={4}
                                icon={<div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 shadow-sm"><AlertTriangle size={18} /></div>}
                            >
                                Classificação
                            </HabitaHeading>
                            
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider ml-1">Tipo de Aviso</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['urgent', 'info', 'event'] as const).map((t) => (
                                        <HabitaButton
                                            key={t}
                                            type="button"
                                            variant={type === t ? (t === 'urgent' ? 'danger' : 'primary') : 'outline'}
                                            onClick={() => setType(t)}
                                            className={clsx(
                                                "h-11 flex-1 px-2",
                                                type === t ? (
                                                    t === 'urgent' ? 'bg-rose-50 border-rose-500 text-rose-600 shadow-md shadow-rose-50' :
                                                    t === 'event' ? 'bg-emerald-50 border-emerald-500 text-emerald-600 shadow-md shadow-emerald-50' :
                                                    'bg-indigo-50 border-indigo-500 text-indigo-600 shadow-md shadow-indigo-50'
                                                ) : 'bg-slate-50/50 text-slate-400'
                                            )}
                                            icon={getTypeIcon(t)}
                                        >
                                            {getTypeLabel(t)}
                                        </HabitaButton>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider ml-1">Importância</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['low', 'medium', 'high'] as const).map((p) => (
                                        <HabitaButton
                                            key={p}
                                            type="button"
                                            variant={priority === p ? 'secondary' : 'outline'}
                                            onClick={() => setPriority(p)}
                                            className={clsx(
                                                "h-11 flex-1",
                                                priority === p ? 'shadow-xl shadow-slate-200' : 'bg-slate-50/50 text-slate-400'
                                            )}
                                        >
                                            {p === 'high' ? 'Alta' : p === 'medium' ? 'Normal' : 'Baixa'}
                                        </HabitaButton>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <HabitaHeading
                                level={4}
                                icon={<div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-sm"><Bell size={18} /></div>}
                            >
                                Agendamento
                            </HabitaHeading>
                            
                            <div className="space-y-4">
                                <HabitaDatePicker
                                    label="Data de Expiração (Opcional)"
                                    value={expiryDate ? new Date(expiryDate + 'T12:00:00') : undefined}
                                    onChange={(date) => setExpiryDate(date ? date.toISOString().split('T')[0] : '')}
                                />
                                <p className="text-[9px] text-slate-400 font-medium italic mt-2">* O aviso deixará de ser visível no mural após esta data.</p>
                            </div>
                        </div>
                    </div>
                </form>
            </HabitaModal>

            {/* Modal: Delete Confirmation */}
            <HabitaModal
                isOpen={!!isDeleting}
                onClose={() => setIsDeleting(null)}
                title="Confirmar Exclusão"
                size="sm"
                footer={
                    <div className="flex gap-3 w-full">
                        <HabitaButton variant="outline" onClick={() => setIsDeleting(null)} className="flex-1 font-bold uppercase tracking-widest text-[10px] h-11">Manter</HabitaButton>
                        <HabitaButton
                            variant="danger" 
                            onClick={confirmDelete} 
                            isLoading={isSaving}
                            className="flex-1 h-11 bg-rose-600 border-rose-600 shadow-lg shadow-rose-100"
                        >
                            Remover
                        </HabitaButton>
                    </div>
                }
            >
                <div className="text-center py-6 space-y-6">
                    <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto border border-rose-100 shadow-sm animate-pulse">
                        <Trash2 size={40} />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Revogar Comunicado?</h4>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed px-4">Esta ação é irreversível e removerá o aviso do mural de todas as unidades cadastras.</p>
                    </div>
                </div>
            </HabitaModal>
        </div>
    );
}
