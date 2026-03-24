import { useState, useMemo } from 'react';
import {
    MapPin, Plus, Pencil, Trash2, Inbox,
    Users, Calendar,
    Clock, CheckCircle, XCircle,
    CalendarClock, Info, Sparkles, Target
} from 'lucide-react';
import { fetchAllFirestoreUsers } from '../utils/FirebaseUtils';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useApp, type Area, type Reserva } from '../contexts/AppContext';
import { hasPermission } from '../utils/rbac';
import { useNotifications } from '../contexts/NotificationContext';
import { clsx } from 'clsx';

// Habita Design System
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaInput, HabitaTextarea } from '../components/ui/HabitaForm';
import { HabitaTabs } from '../components/ui/HabitaTabs';
import { HabitaMobileTabs } from '../components/ui/HabitaMobileTabs';
import { HabitaTable, HabitaTHead, HabitaTBody, HabitaTR, HabitaTH, HabitaTD } from '../components/ui/HabitaTable';
import { HabitaCombobox } from '../components/ui/HabitaCombobox';
import { HabitaIconActionButton } from '../components/ui/HabitaIconActionButton';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';

type MainTab = 'solicitacoes' | 'espacos' | 'calendario';
type SubTab = 'pendentes' | 'aprovadas' | 'rejeitadas';

export function AreasAdminPage() {
    const { isAdmin, accessProfile } = useAuth();
    const canManage = isAdmin || hasPermission(accessProfile, 'areas', 'all');
    const { showToast } = useToast();
    const { sendNotification } = useNotifications();
    const { areas, addArea, updateArea, deleteArea, reservas, updateReserva } = useApp();

    // UI state
    const [activeMainTab, setActiveMainTab] = useState<MainTab>('solicitacoes');
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('pendentes');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingArea, setEditingArea] = useState<Area | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    // Rejection state
    const [reservaToReject, setReservaToReject] = useState<Reserva | null>(null);
    const [rejectionJustification, setRejectionJustification] = useState('');

    // Form state
    const [formData, setFormData] = useState<Omit<Area, 'id' | 'condominiumId'>>({
        nome: '',
        descricao: '',
        capacidade: 0,
        valorReserva: 0,
        antecedenciaMinima: 1,
        antecedenciaMaxima: 30,
        permiteConvidados: true,
        status: 'ativo'
    });

    // Computations
    const pendentes = useMemo(() =>
        reservas.filter(r => r.status === 'pendente')
            .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()),
        [reservas]);

    const aprovadas = useMemo(() =>
        reservas.filter(r => r.status === 'confirmada')
            .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()),
        [reservas]);

    const rejeitadas = useMemo(() =>
        reservas.filter(r => r.status === 'cancelada')
            .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()),
        [reservas]);

    const ocupacaoProxima = useMemo(() => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const trintaDias = new Date(hoje);
        trintaDias.setDate(hoje.getDate() + 30);

        return reservas.filter(r => {
            const dataR = new Date(r.data);
            return r.status === 'confirmada' && dataR >= hoje && dataR <= trintaDias;
        }).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    }, [reservas]);

    const openModal = (area?: Area) => {
        if (area) {
            setEditingArea(area);
            setFormData({
                nome: area.nome,
                descricao: area.descricao,
                capacidade: area.capacidade,
                valorReserva: area.valorReserva,
                antecedenciaMinima: area.antecedenciaMinima,
                antecedenciaMaxima: area.antecedenciaMaxima,
                permiteConvidados: area.permiteConvidados,
                status: area.status
            });
        } else {
            setEditingArea(null);
            setFormData({
                nome: '',
                descricao: '',
                capacidade: 0,
                valorReserva: 0,
                antecedenciaMinima: 1,
                antecedenciaMaxima: 30,
                permiteConvidados: true,
                status: 'ativo'
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nome.trim()) {
            showToast('Por favor, informe o nome da área.', 'warning');
            return;
        }

        try {
            if (editingArea) {
                await updateArea({ ...editingArea, ...formData });
                showToast('Área atualizada com sucesso!', 'success');
            } else {
                const nova: Area = { id: crypto.randomUUID(), ...formData } as Area;
                await addArea(nova);
                showToast('Área cadastrada com sucesso!', 'success');
            }
            setIsModalOpen(false);
        } catch (error) {
            showToast('Erro ao salvar as configurações da área.', 'error');
        }
    };

    const confirmDelete = async () => {
        if (!isDeleting) return;
        try {
            await deleteArea(isDeleting);
            showToast('Área removida com sucesso.', 'info');
        } catch (error) {
            showToast('Erro ao remover área.', 'error');
        } finally {
            setIsDeleting(null);
        }
    };

    const handleApprove = async (res: Reserva) => {
        try {
            await updateReserva({ ...res, status: 'confirmada' });

            // Send notification to the unit residents
            try {
                const users = await fetchAllFirestoreUsers();
                const residents = users.filter((u: any) => u.unitId === res.unitId);
                const areaName = getAreaName(res.areaId);

                await Promise.all(residents.map((resident: any) =>
                    sendNotification({
                        userId: resident.uid,
                        title: 'Reserva Aprovada!',
                        message: `Sua solicitação de reserva para "${areaName}" foi aprovada pelo síndico.`,
                        type: 'success',
                        link: '/reservas' // Default resident booking page
                    })
                ));
            } catch (err) {
                console.error("Erro ao notificar usuário:", err);
            }

            showToast(`Reserva da unidade ${res.unitId} aprovada!`, 'success');
        } catch (error) {
            showToast('Erro ao aprovar reserva.', 'error');
        }
    };

    const handleRejectSubmit = async () => {
        if (!reservaToReject) return;
        if (!rejectionJustification.trim()) {
            showToast('Por favor, informe uma justificativa para a rejeição.', 'warning');
            return;
        }

        try {
            await updateReserva({
                ...reservaToReject,
                status: 'cancelada',
                justificativa: rejectionJustification
            });

            // Send notification to the unit residents
            try {
                const users = await fetchAllFirestoreUsers();
                const residents = users.filter((u: any) => u.unitId === reservaToReject.unitId);
                const areaName = getAreaName(reservaToReject.areaId);

                await Promise.all(residents.map((resident: any) =>
                    sendNotification({
                        userId: resident.uid,
                        title: 'Reserva Rejeitada',
                        message: `Sua solicitação de reserva para "${areaName}" foi rejeitada. Motivo: ${rejectionJustification}`,
                        type: 'error',
                        link: '/reservas'
                    })
                ));
            } catch (err) {
                console.error("Erro ao notificar usuário:", err);
            }

            showToast(`Reserva da unidade ${reservaToReject.unitId} rejeitada.`, 'info');
            setReservaToReject(null);
            setRejectionJustification('');
        } catch (error) {
            showToast('Erro ao processar rejeição.', 'error');
        }
    };

    const getAreaName = (id: string) => areas.find(a => a.id === id)?.nome || 'Área Desconhecida';

    const renderReservationsTable = (data: Reserva[], showActions: boolean = false) => {
        const isSindicoOrAdmin = isAdmin || hasPermission(accessProfile, 'areas', 'all');

        return (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <HabitaTable responsive mobileVariant="list" containerClassName="border border-slate-100 shadow-none overflow-hidden">
                    <HabitaTHead>
                        <HabitaTR>
                            <HabitaTH className="w-20">Unidade</HabitaTH>
                            <HabitaTH>Espaço</HabitaTH>
                            <HabitaTH className="w-32">Data</HabitaTH>
                            <HabitaTH className="w-24">Convidados</HabitaTH>
                            <HabitaTH>Valor</HabitaTH>
                            {activeSubTab === 'rejeitadas' && <HabitaTH>Motivo</HabitaTH>}
                            {showActions && <HabitaTH className="text-right">Ações</HabitaTH>}
                        </HabitaTR>
                    </HabitaTHead>
                    <HabitaTBody>
                        {data.length > 0 ? data.map(res => {
                            const isPending = res.status === 'pendente';
                            const isActionable = isPending && isSindicoOrAdmin;

                            return (
                                <HabitaTR key={res.id}>
                                    {/* Mobile Layout */}
                                    <HabitaTD responsive={false} className="md:hidden block w-full py-4 px-4 border-b border-slate-50 last:border-none">
                                        <div className="flex flex-col gap-3 w-full">
                                            <div className="flex justify-between items-start w-full">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[11px] border border-indigo-100/50 shrink-0">
                                                        {res.unitId}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-bold text-slate-900 text-sm leading-tight truncate">{getAreaName(res.areaId)}</span>
                                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest truncate">Unidade {res.unitId}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-sm font-bold text-emerald-600">
                                                        {res.valor > 0 ? `R$ ${res.valor.toLocaleString()}` : 'Isento'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-2">
                                                    <HabitaBadge variant="neutral" size="xs" className="text-slate-500 font-medium bg-slate-100">
                                                        {new Date(res.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                    </HabitaBadge>
                                                    <HabitaBadge variant="neutral" size="xs" className="text-slate-400 font-medium">
                                                        {res.convidados} pessoas
                                                    </HabitaBadge>
                                                </div>
                                                
                                                <div className="flex items-center gap-2">
                                                    {showActions && isActionable && (
                                                        <>
                                                            <HabitaIconActionButton
                                                                icon={<CheckCircle />}
                                                                variant="success"
                                                                size="sm"
                                                                tooltip="Aprovar"
                                                                className="bg-emerald-50 border-emerald-100"
                                                                onClick={() => handleApprove(res)}
                                                            />
                                                            <HabitaIconActionButton
                                                                icon={<XCircle />}
                                                                variant="danger"
                                                                size="sm"
                                                                tooltip="Rejeitar"
                                                                className="bg-rose-50 border-rose-100"
                                                                onClick={() => setReservaToReject(res)}
                                                            />
                                                        </>
                                                    )}
                                                    {activeSubTab === 'rejeitadas' && (
                                                        <HabitaBadge variant="error" size="xs" className="text-[8px] uppercase">{res.justificativa ? 'Rejeitada' : 'Cancelada'}</HabitaBadge>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {activeSubTab === 'rejeitadas' && res.justificativa && (
                                                <div className="bg-rose-50/50 p-2.5 rounded-lg border border-rose-100">
                                                    <p className="text-[10px] text-rose-600 italic leading-snug">"{res.justificativa}"</p>
                                                </div>
                                            )}
                                        </div>
                                    </HabitaTD>

                                    {/* Desktop Layout */}
                                    <HabitaTD className="hidden md:table-cell">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[10px] border border-indigo-100/50 shrink-0">
                                            {res.unitId}
                                        </div>
                                    </HabitaTD>
                                    <HabitaTD className="hidden md:table-cell">
                                        <span className="font-bold text-slate-800 uppercase tracking-tight text-xs">{getAreaName(res.areaId)}</span>
                                    </HabitaTD>
                                    <HabitaTD className="hidden md:table-cell">
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-800 uppercase tracking-tight text-[11px]">{new Date(res.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase">{new Date(res.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                                        </div>
                                    </HabitaTD>
                                    <HabitaTD className="hidden md:table-cell">
                                        <HabitaBadge variant="neutral" size="xs" className="font-black text-[9px] border-none px-2 py-0.5">
                                            {res.convidados} pessoas
                                        </HabitaBadge>
                                    </HabitaTD>
                                    <HabitaTD className="hidden md:table-cell">
                                        <div className="text-xs font-black text-emerald-600">
                                            {res.valor > 0 ? `R$ ${res.valor.toLocaleString()}` : (
                                                <span className="text-slate-400 uppercase tracking-widest text-[9px]">Isento</span>
                                            )}
                                        </div>
                                    </HabitaTD>
                                    {activeSubTab === 'rejeitadas' && (
                                        <HabitaTD className="hidden md:table-cell">
                                            <div className="text-[10px] text-rose-500 font-bold max-w-xs italic leading-tight">
                                                {res.justificativa || 'Sem justificativa.'}
                                            </div>
                                        </HabitaTD>
                                    )}
                                    {showActions && (
                                        <HabitaTD align="right" className="hidden md:table-cell">
                                            <div className="flex items-center justify-end gap-2">
                                                {isActionable ? (
                                                    <>
                                                        <HabitaButton
                                                            size="sm"
                                                            onClick={() => handleApprove(res)}
                                                            className="bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white rounded-xl font-black text-[9px] uppercase tracking-widest"
                                                            icon={<CheckCircle size={14} />}
                                                        >
                                                            Aprovar
                                                        </HabitaButton>
                                                        <HabitaButton
                                                            size="sm"
                                                            onClick={() => setReservaToReject(res)}
                                                            className="bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white rounded-xl font-black text-[9px] uppercase tracking-widest"
                                                            icon={<XCircle size={14} />}
                                                        >
                                                            Rejeitar
                                                        </HabitaButton>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-2 opacity-40 select-none pr-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Verificado</span>
                                                    </div>
                                                )}
                                            </div>
                                        </HabitaTD>
                                    )}
                                </HabitaTR>
                            );
                        }) : (
                            <HabitaTR>
                                <HabitaTD colSpan={showActions ? 7 : 5} className="py-12 text-center text-slate-400 text-xs font-black uppercase tracking-widest">
                                    Nenhuma solicitação encontrada
                                </HabitaTD>
                            </HabitaTR>
                        )}
                    </HabitaTBody>
                </HabitaTable>
            </div>
        );
    };

    return (
        <div className="w-full animate-in fade-in duration-500 pb-16">
            <HabitaContainer>
                <HabitaContainerHeader 
                    title="Gestão de Áreas e Reservas"
                    subtitle="Administração Geral e Controle de Uso Comum"
                    icon={<CalendarClock size={24} />}
                    actions={activeMainTab === 'espacos' && canManage && (
                        <div className="animate-in slide-in-from-right-4 duration-700">
                            <HabitaButton
                                onClick={() => openModal()}
                                className="bg-slate-900 border-slate-900 text-white rounded-2xl h-12 px-6 font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all text-[10px]"
                                icon={<Plus size={18} />}
                            >
                                Adicionar Local
                            </HabitaButton>
                        </div>
                    )}
                />

                <div className="bg-white border-b border-slate-100 px-5 md:px-8">
                    <HabitaTabs 
                        tabs={[
                            { id: 'solicitacoes', label: 'Solicitações', icon: <Inbox size={16} /> },
                            { id: 'espacos', label: 'Espaços Comuns', icon: <MapPin size={16} /> },
                            { id: 'calendario', label: 'Calendário Global', icon: <Calendar size={16} /> }
                        ]}
                        activeTab={activeMainTab}
                        onChange={(id) => setActiveMainTab(id as MainTab)}
                        className="border-none p-0 h-14 hidden md:flex"
                    />

                    <HabitaMobileTabs
                        tabs={[
                            { id: 'solicitacoes', label: 'Solicitações', icon: <Inbox size={16} /> },
                            { id: 'espacos', label: 'Espaços Comuns', icon: <MapPin size={16} /> },
                            { id: 'calendario', label: 'Calendário Global', icon: <Calendar size={16} /> }
                        ]}
                        activeTab={activeMainTab}
                        onChange={(id) => {
                            setActiveMainTab(id as MainTab);
                            if (id === 'solicitacoes') setActiveSubTab('pendentes');
                        }}
                        className="md:hidden pb-6"
                        label="Gestão de Áreas"
                    />
                </div>

                <HabitaContainerContent padding="none">
                    <div className="p-5 md:p-8 flex-1 flex flex-col" key={activeMainTab}>
                        {activeMainTab === 'solicitacoes' ? (
                            <div className="space-y-8 flex-1 flex flex-col animate-in fade-in duration-500">
                                <HabitaTabs 
                                    tabs={[
                                        { id: 'pendentes', label: 'Pendentes', icon: <Clock size={14} /> },
                                        { id: 'aprovadas', label: 'Aprovadas', icon: <CheckCircle size={14} /> },
                                        { id: 'rejeitadas', label: 'Rejeitadas', icon: <XCircle size={14} /> }
                                    ]}
                                    activeTab={activeSubTab}
                                    onChange={(id) => setActiveSubTab(id as any)}
                                    className="border-none p-1 bg-slate-100/50 rounded-2xl hidden md:flex"
                                />

                                {/* Sub-tabs (Segmented Control on Mobile) */}
                                <div className="md:hidden flex bg-slate-50 border border-slate-100 p-1 rounded-2xl gap-1">
                                    {[
                                        { id: 'pendentes', label: 'Pendentes', icon: <Clock size={14} /> },
                                        { id: 'aprovadas', label: 'Aprovadas', icon: <CheckCircle size={14} /> },
                                        { id: 'rejeitadas', label: 'Rejeitadas', icon: <XCircle size={14} /> }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveSubTab(tab.id as any)}
                                            className={clsx(
                                                "flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-300",
                                                activeSubTab === tab.id 
                                                    ? "bg-white text-indigo-600 shadow-sm border border-slate-100 font-black scale-[1.02]" 
                                                    : "text-slate-400 font-bold hover:bg-white/50"
                                            )}
                                        >
                                            <div className={clsx("mb-1 transition-transform", activeSubTab === tab.id && "scale-110")}>{tab.icon}</div>
                                            <span className="text-[8px] uppercase tracking-widest">{tab.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="animate-in fade-in duration-500 flex-1 mt-6">
                                    {activeSubTab === 'pendentes' && renderReservationsTable(pendentes, true)}
                                    {activeSubTab === 'aprovadas' && renderReservationsTable(aprovadas)}
                                    {activeSubTab === 'rejeitadas' && renderReservationsTable(rejeitadas)}
                                </div>
                            </div>
                        ) : activeMainTab === 'espacos' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-6 duration-700">
                                {areas.length === 0 ? (
                                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-slate-50/30 rounded-3xl border-2 border-dashed border-slate-200/60">
                                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-200 mb-6 border border-slate-100"><MapPin size={32} /></div>
                                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Nenhum espaço configurado</h3>
                                        <p className="text-slate-400 text-sm max-w-xs font-medium">Inicie o monitoramento cadastrando as áreas comuns de uso do condomínio.</p>
                                    </div>
                                ) : (
                                    areas.map(area => (
                                        <div key={area.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm group overflow-hidden hover:shadow-xl hover:shadow-indigo-100/30 transition-all duration-500 flex flex-col">
                                            <div className="p-6 flex-1 flex flex-col">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm border border-slate-200"><MapPin size={20} /></div>
                                                    <div className="flex gap-2">
                                                        <HabitaIconActionButton
                                                            icon={<Pencil />}
                                                            variant="ghost"
                                                            size="md"
                                                            tooltip="Editar"
                                                            className="bg-slate-50 border border-slate-100"
                                                            onClick={() => openModal(area)}
                                                        />
                                                        <HabitaIconActionButton
                                                            icon={<Trash2 />}
                                                            variant="ghost"
                                                            size="md"
                                                            tooltip="Excluir"
                                                            className="bg-slate-50 border border-slate-100 hover:text-rose-600 hover:bg-rose-50"
                                                            onClick={() => setIsDeleting(area.id)}
                                                        />
                                                    </div>
                                                </div>
                                                <h3 className="font-black text-base text-slate-800 uppercase tracking-tight mb-4 group-hover:text-indigo-600 transition-colors truncate">{area.nome}</h3>
                                                
                                                <div className="grid grid-cols-2 gap-3 mb-6">
                                                    <div className="bg-slate-50/80 p-3 rounded-xl flex flex-col gap-0.5 border border-slate-200">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Capacidade</span>
                                                        <span className="text-xs font-black text-slate-700">{area.capacidade} <span className="text-[9px] opacity-60">PES</span></span>
                                                    </div>
                                                    <div className="bg-slate-50/80 p-3 rounded-xl flex flex-col gap-0.5 border border-slate-200">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Taxa</span>
                                                        <span className="text-xs font-black text-emerald-600 truncate">{area.valorReserva > 0 ? `R$ ${area.valorReserva}` : 'GRÁTIS'}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-auto">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                                                    <HabitaBadge 
                                                        variant={area.status === 'ativo' ? 'success' : 'neutral'}
                                                        className="font-black text-[8px] uppercase tracking-widest px-2.5 py-1 rounded-lg border-none"
                                                    >
                                                        {area.status}
                                                    </HabitaBadge>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="animate-in fade-in duration-700 space-y-8 flex-1">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                                    <div>
                                        <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-4 text-slate-800">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100/50">
                                                <CalendarClock size={20} />
                                            </div>
                                            Resumo de Ocupação do Mês
                                        </h3>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2 ml-14">Próximos 30 dias de reservas confirmadas</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {ocupacaoProxima.length === 0 ? (
                                        <div className="col-span-full py-20 flex flex-col items-center justify-center bg-slate-50/30 rounded-2xl border-2 border-dashed border-slate-200">
                                            <div className="w-16 h-16 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-200 mb-4"><Calendar size={32} /></div>
                                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic">Nenhuma reserva confirmada para este período.</p>
                                        </div>
                                    ) : (
                                        ocupacaoProxima.map(res => (
                                            <div key={res.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-100/30 transition-all duration-500 group relative overflow-hidden flex flex-col">
                                                <div className="flex justify-between items-start mb-4 relative z-10">
                                                    <div className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[8px] font-black border border-indigo-100 shadow-sm">UNID: {res.unitId}</div>
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex flex-col items-end">
                                                        <span>{new Date(res.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit' })}</span>
                                                        <span className="text-[8px] opacity-60 uppercase">{new Date(res.data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' })}</span>
                                                    </div>
                                                </div>
                                                <h4 className="font-black uppercase tracking-tight text-xs text-slate-800 mb-4 group-hover:text-indigo-600 transition-colors truncate">{getAreaName(res.areaId)}</h4>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-auto"><Users size={12} className="text-indigo-400" /> {res.convidados} convidados</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </HabitaContainerContent>
            </HabitaContainer>

            {/* Modals */}
            <HabitaModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingArea ? 'Configurar Espaço' : 'Novo Espaço Comum'}
                size="lg"
                footer={
                    <div className="flex gap-3 w-full sm:w-auto">
                        <HabitaButton variant="outline" className="flex-1 sm:flex-none h-11 px-8 rounded-xl font-bold uppercase tracking-widest text-[10px]" onClick={() => setIsModalOpen(false)}>
                            Cancelar
                        </HabitaButton>
                        <HabitaButton
                            onClick={handleSave}
                            className="flex-1 sm:flex-none bg-slate-900 border-slate-900 text-white h-11 px-8 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200"
                        >
                            {editingArea ? 'Salvar Alterações' : 'Criar Novo Espaço'}
                        </HabitaButton>
                    </div>
                }
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                                <Info size={20} />
                            </div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informações Básicas</h4>
                        </div>
                        
                        <HabitaInput 
                            label="Nome do Espaço"
                            required 
                            value={formData.nome} 
                            onChange={(e: any) => setFormData({ ...formData, nome: e.target.value })} 
                            placeholder="Ex: Salão de Festas Master"
                            className="bg-slate-50/50 border-slate-200 h-12"
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <HabitaInput 
                                label="Capacidade"
                                type="number" 
                                required 
                                value={formData.capacidade} 
                                onChange={(e: any) => setFormData({ ...formData, capacidade: parseInt(e.target.value) || 0 })} 
                                className="bg-slate-50/50 border-slate-200 h-12"
                            />
                            <HabitaInput 
                                label="Taxa (R$)"
                                type="number" 
                                required 
                                value={formData.valorReserva} 
                                onChange={(e: any) => setFormData({ ...formData, valorReserva: parseFloat(e.target.value) || 0 })} 
                                className="bg-slate-50/50 border-slate-200 h-12"
                            />
                        </div>

                        <HabitaCombobox
                            label="Status do Local"
                            value={formData.status}
                            onChange={val => setFormData({ ...formData, status: val as any })}
                            className="bg-slate-50/50 border-slate-200 h-10"
                            options={[
                                { value: 'ativo', label: 'Disponível para Reserva' },
                                { value: 'manutencao', label: 'Em Manutenção (Bloqueado)' }
                            ]}
                        />
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                                <Target size={20} />
                            </div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Regras & Política de Uso</h4>
                        </div>
                        
                        <HabitaTextarea 
                            label="Descrição e Normas"
                            placeholder="Descreva as regras de limpeza, horários permitidos..."
                            value={formData.descricao} 
                            onChange={(e: any) => setFormData({ ...formData, descricao: e.target.value })} 
                            rows={6}
                            className="bg-slate-50/50 border-slate-200 resize-none p-4"
                        />

                        <div className="bg-amber-50/30 p-5 rounded-2xl border border-amber-100/50 mt-4">
                            <div className="flex gap-4">
                                <Sparkles size={18} className="text-amber-500 shrink-0" />
                                <p className="text-[10px] font-bold text-amber-900/60 leading-relaxed italic">
                                    Dica: Seja claro nas regras para evitar conflitos e garantir a preservação do patrimônio.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </HabitaModal>

            <HabitaModal
                isOpen={!!reservaToReject}
                onClose={() => setReservaToReject(null)}
                title="Motivo da Rejeição"
                size="sm"
                footer={
                    <div className="flex gap-3 w-full">
                        <HabitaButton variant="outline" className="flex-1 h-11 rounded-xl font-bold uppercase tracking-widest text-[10px]" onClick={() => setReservaToReject(null)}>
                            Voltar
                        </HabitaButton>
                        <HabitaButton
                            onClick={handleRejectSubmit}
                            className="flex-1 bg-rose-600 border-rose-600 text-white h-11 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-rose-100"
                        >
                            Rejeitar Agora
                        </HabitaButton>
                    </div>
                }
            >
                <div className="space-y-6">
                    <div className="flex items-center gap-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100/50">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm font-black text-[10px] border border-slate-100">UN: {reservaToReject?.unitId}</div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Espaço solicitado</p>
                            <p className="text-xs font-black text-slate-800">{getAreaName(reservaToReject?.areaId || '')}</p>
                        </div>
                    </div>
                    
                    <HabitaTextarea 
                        label="Justificativa administrativa"
                        placeholder="Informe o morador por que a reserva foi negada..."
                        value={rejectionJustification} 
                        onChange={(e: any) => setRejectionJustification(e.target.value)} 
                        rows={4}
                        className="bg-slate-50/50 border-slate-200 resize-none"
                    />
                </div>
            </HabitaModal>

            <HabitaModal
                isOpen={!!isDeleting}
                onClose={() => setIsDeleting(null)}
                title="Remover Área?"
                size="sm"
                footer={
                    <div className="flex gap-3 w-full">
                        <HabitaButton variant="outline" className="flex-1 h-11 rounded-xl font-bold uppercase tracking-widest text-[10px]" onClick={() => setIsDeleting(null)}>
                            Manter
                        </HabitaButton>
                        <HabitaButton
                            onClick={confirmDelete}
                            className="flex-1 bg-rose-600 border-rose-600 text-white h-11 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-rose-100"
                        >
                            Remover
                        </HabitaButton>
                    </div>
                }
            >
                <div className="text-center py-4">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-rose-100">
                        <Trash2 size={32} />
                    </div>
                    <p className="text-slate-600 font-bold text-sm leading-relaxed mb-4">
                        Deseja realmente remover este espaço comum permanentemente? Esta ação não pode ser desfeita.
                    </p>
                </div>
            </HabitaModal>
        </div>
    );
}

export default AreasAdminPage;
