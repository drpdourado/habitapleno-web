import React, { useState, useMemo } from 'react';
import {
    Calendar as CalendarIcon, MapPin, Users, DollarSign,
    ChevronLeft, ChevronRight,
    Info, Sparkles, Check,
    History, Trash2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { useApp, type Area, type Reserva } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

// Habita Design System
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaInput, HabitaCheckbox } from '../components/ui/HabitaForm';
import { HabitaTabs } from '../components/ui/HabitaTabs';
import { HabitaIconActionButton } from '../components/ui/HabitaIconActionButton';
import { HabitaSpinner } from '../components/ui/HabitaSpinner';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tab = 'agendar' | 'meus';

export function BookingPage() {
    const { areas, reservas, addReserva, updateReserva, isLoading } = useApp();
    const { profile, user } = useAuth();
    const { showToast } = useToast();

    // UI state
    const [activeTab, setActiveTab] = useState<Tab>('agendar');
    const [selectedArea, setSelectedArea] = useState<Area | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        convidados: 1,
        aceitoTermos: false
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cancelingReserva, setCancelingReserva] = useState<Reserva | null>(null);

    // Context helpers
    const userUnitId = useMemo(() => profile?.unitId || user?.email?.split('@')[0] || 'Unknown', [profile, user]);
    const myReservations = useMemo(() =>
        reservas.filter(r => r.unitId === userUnitId)
            .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
        [reservas, userUnitId]);

    const activeAreas = useMemo(() => areas.filter(a => a.status === 'ativo'), [areas]);

    // Calendar logic helpers
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const totalDays = getDaysInMonth(year, month);
        const startDay = getFirstDayOfMonth(year, month);

        const days = [];
        for (let i = 0; i < startDay; i++) {
            days.push(null);
        }
        for (let i = 1; i <= totalDays; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    }, [currentMonth]);

    const isDateBooked = (date: Date) => {
        if (!selectedArea) return false;
        const dateStr = date.toLocaleDateString('en-CA');
        return reservas.some(r =>
            r.areaId === selectedArea.id &&
            r.data === dateStr &&
            (r.status === 'confirmada' || r.status === 'pendente')
        );
    };

    const isDateOutsideLeadTime = (date: Date) => {
        if (!selectedArea) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dateToCheck = new Date(date);
        dateToCheck.setHours(0, 0, 0, 0);
        const minDate = new Date(today);
        minDate.setDate(today.getDate() + (selectedArea.antecedenciaMinima || 0));
        const maxDate = new Date(today);
        maxDate.setDate(today.getDate() + (selectedArea.antecedenciaMaxima || 365));
        return dateToCheck < minDate || dateToCheck > maxDate;
    };

    const handleDateClick = (date: Date) => {
        if (isDateBooked(date) || isDateOutsideLeadTime(date)) return;
        setSelectedDate(date);
    };

    const nextMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
        setSelectedDate(null);
    };

    const prevMonth = () => {
        const now = new Date();
        const currentNow = new Date(now.getFullYear(), now.getMonth(), 1);
        if (currentMonth <= currentNow) return;
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
        setSelectedDate(null);
    };

    const handleBookingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedArea || !selectedDate) return;

        if (!formData.aceitoTermos) {
            showToast('Você deve aceitar os termos para realizar a reserva.', 'warning');
            return;
        }

        if (formData.convidados < 1 || formData.convidados > selectedArea.capacidade) {
            showToast(`Quantidade de convidados inválida (Máx: ${selectedArea.capacidade}).`, 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const reservaId = crypto.randomUUID();
            const novaReserva: Reserva = {
                id: reservaId,
                areaId: selectedArea.id,
                unitId: userUnitId,
                data: selectedDate.toLocaleDateString('en-CA'),
                valor: selectedArea.valorReserva,
                convidados: formData.convidados,
                status: 'pendente',
                createdAt: new Date().toISOString()
            };

            await addReserva(novaReserva);



            showToast('Solicitação de reserva enviada com sucesso!', 'success');
            setIsBookingModalOpen(false);
            setSelectedDate(null);
            setFormData({ convidados: 1, aceitoTermos: false });
            setActiveTab('meus');
        } catch (error) {
            showToast('Erro ao processar sua reserva. Tente novamente.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmCancelReserva = async () => {
        if (!cancelingReserva) return;

        const now = new Date();
        const resDate = new Date(cancelingReserva.data);
        const diffHours = (resDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (cancelingReserva.status === 'confirmada' && diffHours < 24) {
            showToast('Reservas confirmadas só podem ser canceladas com 24h de antecedência.', 'warning');
            setCancelingReserva(null);
            return;
        }

        try {
            await updateReserva({ ...cancelingReserva, status: 'cancelada' });
            showToast('Reserva cancelada com sucesso.', 'success');
        } catch (error) {
            showToast('Erro ao cancelar reserva.', 'error');
        } finally {
            setCancelingReserva(null);
        }
    };

    const getAreaName = (id: string) => areas.find(a => a.id === id)?.nome || 'Área Desconhecida';

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <HabitaSpinner size="lg" variant="primary" showLabel label="Verificando disponibilidades..." />
            </div>
        );
    }

    const bookingTabs = [
        { id: 'agendar', label: 'Agendar Espaço', icon: <Sparkles size={16} /> },
        { id: 'meus', label: 'Meus Agendamentos', icon: <History size={16} /> }
    ];

    return (
        <div className="w-full animate-in fade-in duration-500 pb-16">
            <HabitaContainer>
                <HabitaContainerHeader 
                    title="Minhas Reservas"
                    subtitle="Reserve espaços e gerencie seus agendamentos"
                    icon={<CalendarIcon size={24} />}
                />

                <div className="bg-white border-b border-slate-100 px-5 md:px-8">
                    <HabitaTabs 
                        tabs={bookingTabs} 
                        activeTab={activeTab} 
                        onChange={(id) => setActiveTab(id as Tab)} 
                        className="border-none p-0 h-14"
                    />
                </div>

                <HabitaContainerContent padding="none">
                    <div className="p-5 md:p-8 flex-1 flex flex-col">

            {activeTab === 'agendar' ? (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {activeAreas.map(area => (
                            <button
                                key={area.id}
                                onClick={() => { setSelectedArea(area); setSelectedDate(null); }}
                                className={cn(
                                    "group p-6 rounded-3xl border transition-all text-left flex flex-col relative overflow-hidden h-full",
                                    selectedArea?.id === area.id
                                        ? "bg-indigo-50/30 border-indigo-500 shadow-xl shadow-indigo-100/50 ring-1 ring-indigo-500/20"
                                        : "bg-white border-slate-100 hover:border-indigo-300 hover:shadow-xl hover:shadow-slate-200/50 shadow-sm"
                                )}
                            >
                                {selectedArea?.id === area.id && (
                                    <div className="absolute top-0 right-0 p-3 bg-indigo-600 text-white rounded-bl-2xl shadow-sm">
                                        <Check size={14} />
                                    </div>
                                )}
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm border mb-4",
                                    selectedArea?.id === area.id ? "bg-white text-indigo-600 border-indigo-100" : "bg-slate-50 text-slate-400 border-slate-100 group-hover:bg-white group-hover:text-indigo-400 group-hover:border-indigo-100"
                                )}>
                                    <MapPin size={24} />
                                </div>
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2 truncate">{area.nome}</h3>
                                <div className="flex flex-wrap items-center gap-2 mt-auto">
                                    <HabitaBadge variant="neutral" className="bg-slate-100 text-slate-600 font-black text-[9px] uppercase tracking-widest px-2 py-1 rounded-lg border-none">
                                        <Users size={12} className="mr-1 inline text-indigo-500" /> {area.capacidade}
                                    </HabitaBadge>
                                    <HabitaBadge variant="neutral" className="bg-emerald-50 text-emerald-700 font-black text-[9px] uppercase tracking-widest px-2 py-1 rounded-lg border-none">
                                        <DollarSign size={12} className="mr-0.5 inline" /> {area.valorReserva > 0 ? `R$ ${area.valorReserva.toLocaleString()}` : 'Grátis'}
                                    </HabitaBadge>
                                </div>
                            </button>
                        ))}
                    </div>

                    {selectedArea ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-8">
                            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden animate-in slide-in-from-left-4 duration-500">
                                <div className="p-6 bg-slate-50/40 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-indigo-600">
                                            <CalendarIcon size={20} />
                                        </div>
                                        <h2 className="text-base font-black text-slate-800 uppercase tracking-tighter">
                                            {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                        </h2>
                                    </div>
                                    <div className="flex gap-2">
                                        <HabitaIconActionButton
                                            icon={<ChevronLeft />}
                                            variant="outline"
                                            size="sm"
                                            tooltip="Mês Anterior"
                                            className="rounded-xl border-slate-200"
                                            onClick={prevMonth}
                                        />
                                        <HabitaIconActionButton
                                            icon={<ChevronRight />}
                                            variant="outline"
                                            size="sm"
                                            tooltip="Próximo Mês"
                                            className="rounded-xl border-slate-200"
                                            onClick={nextMonth}
                                        />
                                    </div>
                                </div>
                                <div className="p-6 md:p-8">
                                    <div className="grid grid-cols-7 gap-2 mb-4">
                                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                                            <div key={d} className="text-center py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{d}</div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-2">
                                        {calendarDays.map((date, i) => {
                                            if (!date) return <div key={`empty-${i}`} className="aspect-square bg-slate-50/20 rounded-xl" />;
                                            const booked = isDateBooked(date);
                                            const blocked = isDateOutsideLeadTime(date);
                                            const isSelected = selectedDate?.getTime() === date.getTime();
                                            const isToday = new Date().toDateString() === date.toDateString();
                                            return (
                                                <button
                                                    key={date.toISOString()}
                                                    disabled={booked || blocked}
                                                    onClick={() => handleDateClick(date)}
                                                    className={cn(
                                                        "aspect-square rounded-2xl flex flex-col items-center justify-center transition-all relative border-2",
                                                        isSelected ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 z-10 scale-105" :
                                                            booked ? "bg-slate-50 border-slate-50 text-slate-300 cursor-not-allowed" :
                                                                blocked ? "bg-slate-50/30 border-transparent text-slate-100 cursor-not-allowed opacity-40" :
                                                                    "bg-white border-slate-50 hover:border-indigo-200 hover:bg-slate-50 text-slate-700 font-black"
                                                    )}
                                                >
                                                    <span className={cn("text-sm", isToday && !isSelected && "text-indigo-600")}>{date.getDate()}</span>
                                                    {booked && <span className="text-[7px] font-black uppercase tracking-tighter mt-1 opacity-60">Reservado</span>}
                                                    {isToday && !isSelected && <div className="w-1 h-1 bg-indigo-500 rounded-full absolute bottom-2" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-wrap gap-6 justify-center">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"><div className="w-3 h-3 rounded-full bg-white border border-slate-300 shadow-sm" /> Disponível</div>
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"><div className="w-3 h-3 rounded-full bg-indigo-600 shadow-sm" /> Selecionado</div>
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"><div className="w-3 h-3 rounded-full bg-slate-200" /> Indisponível</div>
                                </div>
                            </div>

                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-8 relative overflow-hidden group">
                                    <div className="h-1.5 w-full bg-indigo-500 absolute top-0 left-0" />
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-8 flex items-center gap-3 border-b border-slate-50 pb-6"><Info size={18} className="text-indigo-600" /> Detalhes do Local</h3>
                                    <div className="space-y-4">
                                        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex items-center gap-4 group-hover:bg-white transition-colors">
                                            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-indigo-500 shadow-sm border border-slate-100 transition-transform group-hover:scale-110"><Users size={20} /></div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Capacidade Máxima</p>
                                                <p className="font-black text-slate-700">{selectedArea.capacidade} Convidados</p>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex items-center gap-4 group-hover:bg-white transition-colors">
                                            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm border border-slate-100 transition-transform group-hover:scale-110"><DollarSign size={20} /></div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Taxa de Reserva</p>
                                                <p className="font-black text-slate-700">{selectedArea.valorReserva > 0 ? `R$ ${selectedArea.valorReserva.toLocaleString()}` : 'Uso Isento'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-8 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 text-[11px] text-indigo-600 leading-relaxed font-bold">
                                        <Sparkles size={14} className="mb-2" />
                                        {selectedArea.descricao || "Aproveite seu espaço reservado com responsabilidade e cuidado com o patrimônio comum."}
                                    </div>
                                </div>
                                {selectedDate ? (
                                    <HabitaButton 
                                        onClick={() => setIsBookingModalOpen(true)} 
                                        className="w-full bg-slate-950 text-white rounded-2xl py-6 font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all text-sm h-auto"
                                    >
                                        Solicitar Agendamento
                                    </HabitaButton>
                                ) : (
                                    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 text-center border-dashed">
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Selecione uma data no calendário</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 bg-slate-50/30 rounded-3xl border-2 border-dashed border-slate-200/60 mt-8">
                            <div className="w-24 h-24 bg-white text-slate-200 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-slate-200/50 border border-slate-100"><MapPin size={48} /></div>
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Qual local você deseja reservar?</h2>
                            <p className="text-slate-500 text-sm max-w-sm text-center font-medium">Selecione um dos espaços disponíveis acima para verificar datas livres e condições de uso.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    {myReservations.length === 0 ? (
                        <div className="bg-slate-50 rounded border-2 border-dashed border-slate-200 p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                            Você ainda não realizou nenhuma reserva.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {myReservations.map(res => {
                                const isPast = new Date(res.data) < new Date(new Date().setHours(0, 0, 0, 0));
                                const canCancel = (res.status === 'pendente' || res.status === 'confirmada') && !isPast;
                                const statusColors = {
                                    pendente: "bg-amber-50 text-amber-600 border-amber-100",
                                    confirmada: "bg-emerald-50 text-emerald-600 border-emerald-100",
                                    cancelada: "bg-rose-50 text-rose-600 border-rose-100"
                                };
                                const statusLabels = {
                                    pendente: "Aguardando",
                                    confirmada: "Confirmado",
                                    cancelada: "Cancelado"
                                };

                                return (
                                    <div key={res.id} className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col group relative hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500">
                                        <div className={cn(
                                            "h-1.5 w-full",
                                            res.status === 'pendente' ? "bg-amber-400" : res.status === 'confirmada' ? "bg-emerald-500" : "bg-rose-400"
                                        )} />
                                        
                                        <div className="p-6 flex-1 flex flex-col gap-6">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex flex-col gap-1">
                                                    <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm leading-tight pr-4">{getAreaName(res.areaId)}</h4>
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                                        <CalendarIcon size={12} className="text-indigo-500" /> 
                                                        {new Date(res.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                    </div>
                                                </div>
                                                <span className={cn("px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border shrink-0", statusColors[res.status as keyof typeof statusColors])}>
                                                    {statusLabels[res.status as keyof typeof statusLabels]}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <HabitaBadge variant="neutral" className="bg-slate-50 text-slate-600 font-bold border-none py-1 px-3">
                                                    <Users size={12} className="mr-1.5 inline" /> {res.convidados}
                                                </HabitaBadge>
                                                <HabitaBadge variant="neutral" className="bg-slate-50 text-slate-600 font-bold border-none py-1 px-3">
                                                    <DollarSign size={12} className="mr-0.5 inline" /> R$ {res.valor.toLocaleString()}
                                                </HabitaBadge>
                                            </div>

                                            {res.justificativa && res.status === 'cancelada' && (
                                                <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl text-[10px] text-rose-600 italic font-medium">
                                                    <strong className="uppercase mr-1 notar">Motivo:</strong> {res.justificativa}
                                                </div>
                                            )}

                                            {canCancel && (
                                                <div className="mt-auto pt-4 border-t border-slate-50 flex justify-end">
                                                    <HabitaButton 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => setCancelingReserva(res)}
                                                        className="h-10 px-4 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 font-black text-[9px] uppercase tracking-widest flex gap-2"
                                                        icon={<Trash2 size={14} />}
                                                    >
                                                        Cancelar Reserva
                                                    </HabitaButton>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            {/* Modals */}
            <HabitaModal
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
                title="Confirmar Agendamento"
                size="lg"
                footer={
                    <div className="flex gap-4 w-full">
                        <HabitaButton variant="outline" className="flex-1" onClick={() => setIsBookingModalOpen(false)}>
                            Descartar
                        </HabitaButton>
                        <HabitaButton
                            onClick={handleBookingSubmit}
                            isLoading={isSubmitting}
                            className="flex-[2] bg-slate-900 border-slate-900 shadow-xl shadow-slate-100"
                        >
                            Finalizar Reserva
                        </HabitaButton>
                    </div>
                }
            >
                {selectedArea && selectedDate && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="bg-indigo-50/50 border border-indigo-100 p-8 rounded-3xl text-indigo-900 flex flex-col items-center text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4">Data Solicitada</p>
                                <p className="text-6xl font-black mb-2">{selectedDate.getDate()}</p>
                                <p className="text-lg font-black uppercase tracking-tight text-indigo-700">
                                    {selectedDate.toLocaleDateString('pt-BR', { month: 'long' })}
                                </p>
                                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-1">
                                    {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })}
                                </p>
                            </div>
                            
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <div className="flex justify-between items-center font-black">
                                    <span className="text-[10px] uppercase text-slate-400 tracking-widest">Taxa Administrativa</span>
                                    <span className="text-xl text-emerald-600">
                                        {selectedArea.valorReserva > 0 ? `R$ ${selectedArea.valorReserva.toLocaleString()}` : "ISENTO"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 pt-2">
                            <div className="p-2">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1 flex items-center gap-2">
                                    <Users size={14} className="text-indigo-500" /> Detalhes da Utilização
                                </h4>
                                
                                <HabitaInput 
                                    label="Número de Convidados"
                                    type="number" 
                                    min={1} 
                                    max={selectedArea.capacidade} 
                                    value={formData.convidados} 
                                    onChange={e => setFormData({ ...formData, convidados: parseInt(e.target.value) || 0 })} 
                                    placeholder="Ex: 10"
                                />
                                
                                <div className="mt-8 p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
                                    <HabitaCheckbox
                                        label="Declaro estar ciente e de acordo com todas as normas de uso, limpeza e conservação deste espaço."
                                        checked={formData.aceitoTermos}
                                        onChange={e => setFormData({ ...formData, aceitoTermos: e.target.checked })}
                                        containerClassName="h-auto"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                                <div className="flex gap-3 mb-1">
                                    <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                    <p className="text-[10px] font-bold text-slate-500 leading-normal italic">
                                        Sua reserva passará por uma análise administrativa antes da confirmação final.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </HabitaModal>

            <HabitaModal
                isOpen={!!cancelingReserva}
                onClose={() => setCancelingReserva(null)}
                title="Cancelar Agendamento?"
                size="sm"
                footer={
                    <div className="flex gap-4 w-full">
                        <HabitaButton variant="outline" className="flex-1" onClick={() => setCancelingReserva(null)}>
                            Voltar
                        </HabitaButton>
                        <HabitaButton
                            onClick={confirmCancelReserva}
                            className="flex-1 bg-rose-600 border-rose-600 shadow-xl shadow-rose-100"
                        >
                            Confirmar Cancelamento
                        </HabitaButton>
                    </div>
                }
            >
                <div className="p-2 text-center">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-rose-100">
                        <Trash2 size={32} />
                    </div>
                    <p className="text-slate-600 font-medium leading-relaxed">
                        {cancelingReserva?.status === 'confirmada' 
                            ? "Atenção: Reservas confirmadas só podem ser canceladas com 24h de antecedência. Deseja prosseguir com a solicitação?" 
                            : "Deseja realmente cancelar esta solicitação de reserva? Esta ação não pode ser desfeita."}
                    </p>
                </div>
            </HabitaModal>
                </div>
                </HabitaContainerContent>
            </HabitaContainer>
        </div>
    );
}

export default BookingPage;
