import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../contexts/ToastContext';
import { condoService } from '../../services/CondoService';
import type { Poll, PollVote } from './types';
import { CheckCircle2, Clock, BarChart2, CheckSquare, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { hasPermission } from '../../utils/rbac';
import { PollDetailsModal } from './PollDetailsModal';

// Habita Design System
import { HabitaBadge } from '../../components/ui/HabitaBadge';
import { HabitaButton } from '../../components/ui/HabitaButton';
import { HabitaCard, HabitaCardContent, HabitaCardFooter } from '../../components/ui/HabitaCard';
import { HabitaSpinner } from '../../components/ui/HabitaSpinner';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

function PollCard({ poll, currentUnitId, canViewDetails }: { poll: Poll, currentUnitId: string, canViewDetails: boolean }) {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [votes, setVotes] = useState<PollVote[]>([]);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isVoting, setIsVoting] = useState(false);

    useEffect(() => {
        if (!poll.id) return;

        // Listen to votes via CondoService (em vez de onSnapshot direto)
        const unsub = condoService.listenVotes(poll.id, (data) => {
            setVotes(data);
        });

        return () => unsub();
    }, [poll.id]);

    const myVote = votes.find(v => v.unitId === currentUnitId);
    const isClosed = poll.status === 'closed' || new Date(poll.endDate) <= new Date();

    const totalVotes = votes.length;

    // Prepare chart data
    const chartData = useMemo(() => {
        return poll.options.map((opt, idx) => {
            const count = votes.filter(v => {
                const voteIdx = v.selectedOptionIndex !== undefined ? v.selectedOptionIndex : 
                               (v.votedOption !== undefined ? v.votedOption : v.optionId);
                return Number(voteIdx) === idx;
            }).length;
            const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            return {
                name: opt,
                votes: count,
                percentage
            };
        });
    }, [poll.options, votes, totalVotes]);

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    const handleVote = async () => {
        if (selectedOption === null || !poll.id) {
            showToast('Selecione uma opção para votar.', 'warning');
            return;
        }

        if (myVote) {
            showToast('Seu voto já foi registrado para esta unidade.', 'error');
            return;
        }

        setIsVoting(true);
        try {
            // Usar CondoService em vez de setDoc direto
            const result = await condoService.castVote({
                pollId: poll.id,
                unitId: currentUnitId,
                userId: user?.uid || '',
                userName: user?.name || user?.email || 'Morador',
                optionId: selectedOption
            });

            if (result.success) {
                showToast('Voto registrado com sucesso!', 'success');
            } else {
                showToast(result.error || 'Erro ao registrar voto.', 'error');
            }
        } catch (error) {
            console.error("Erro ao votar:", error);
            showToast('Erro ao registrar voto.', 'error');
        } finally {
            setIsVoting(false);
        }
    };

    return (
        <HabitaCard 
            padding="none" 
            className="overflow-hidden flex flex-col h-full hover:border-indigo-200 transition-all group border-slate-200 shadow-sm"
        >
            <div className={cn(
                "px-5 py-3.5 border-b flex items-center justify-between",
                isClosed ? 'bg-slate-50/50 border-slate-100' : 'bg-indigo-50/20 border-indigo-50/50'
            )}>
                <HabitaBadge variant={isClosed ? "neutral" : "indigo"} size="xs" className="font-black">
                    {isClosed ? 'ENCERRADA' : 'ATIVA'}
                </HabitaBadge>
                
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Clock size={12} className="text-slate-300" />
                    <span>
                        {new Date(poll.endDate).toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: 'short', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        })}
                    </span>
                </div>
            </div>

            <HabitaCardContent padding="lg" className="flex-1 flex flex-col">
                <div className="mb-4">
                    <h3 className="text-base font-black text-slate-900 leading-snug uppercase tracking-tight mb-2">
                        {poll.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 leading-relaxed line-clamp-2">
                        {poll.description}
                    </p>
                </div>

                {(!isClosed && !myVote) && (
                    <div className="space-y-2 mt-2">
                        {poll.options.map((opt, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelectedOption(idx)}
                                className={cn(
                                    "w-full text-left px-5 py-3.5 border rounded-2xl transition-all flex items-center justify-between group/opt",
                                    selectedOption === idx
                                        ? "border-indigo-500 bg-indigo-50/40 ring-4 ring-indigo-500/5 shadow-sm"
                                        : "border-slate-100 bg-slate-50/30 hover:border-indigo-200 hover:bg-white"
                                )}
                            >
                                <span className={cn(
                                    "text-xs font-black uppercase tracking-wide", 
                                    selectedOption === idx ? "text-indigo-700" : "text-slate-600 group-hover/opt:text-indigo-600"
                                )}>
                                    {opt}
                                </span>
                                {selectedOption === idx && (
                                    <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-200">
                                        <CheckCircle2 className="text-white" size={14} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {(isClosed || myVote || canViewDetails) && (
                    <div className="mt-4 flex-1 flex flex-col justify-end">
                        <div className="mb-3 flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <BarChart2 size={12} className="text-indigo-400" /> 
                                {isClosed ? 'Relatório Final' : 'Parcial de Votos'}
                            </h4>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                {totalVotes} Votantes
                            </span>
                        </div>

                        <div className="w-full min-w-0 bg-slate-50/30 rounded-2xl p-4 border border-slate-100/50 shadow-inner">
                            <ResponsiveContainer width="100%" height={160}>
                                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 25, left: 10, bottom: 5 }}>
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        width={80} 
                                        tick={{ fontSize: 9, fontWeight: '900', fill: '#94a3b8' }} 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tickFormatter={(val) => val.length > 12 ? `${val.substring(0, 10)}...` : val}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(99, 102, 241, 0.05)', radius: 8 }}
                                        contentStyle={{ 
                                            borderRadius: '16px', 
                                            border: '1px solid #e2e8f0', 
                                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                            fontSize: '11px',
                                            fontWeight: '900',
                                            textTransform: 'uppercase',
                                            padding: '12px'
                                        }}
                                        labelStyle={{ color: '#1e293b', marginBottom: '4px' }}
                                    />
                                    <Bar dataKey="votes" radius={[0, 10, 10, 0]} barSize={16}>
                                        {chartData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </HabitaCardContent>

            <HabitaCardFooter className="px-6 pb-6 pt-0 flex flex-col gap-3">
                {(!isClosed && !myVote) && (
                    <HabitaButton
                        onClick={handleVote}
                        disabled={selectedOption === null || isVoting}
                        isLoading={isVoting}
                        className="w-full bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-100 h-11 text-[11px] font-black uppercase tracking-widest"
                    >
                        Confirmar Participação
                    </HabitaButton>
                )}

                {myVote && !isClosed && (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl py-3 text-center animate-in zoom-in duration-500">
                        <div className="flex flex-col items-center gap-0.5">
                            <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-[0.2em]">
                                <CheckCircle2 size={16} strokeWidth={3} /> Voto Computado
                            </div>
                            <span className="text-[9px] text-emerald-400 uppercase font-black tracking-widest opacity-70">
                                Unidade {currentUnitId}
                            </span>
                        </div>
                    </div>
                )}

                {canViewDetails && (
                    <HabitaButton
                        variant="outline"
                        onClick={() => poll.onAudit?.(poll)}
                        size="sm"
                        icon={<Eye size={14} />}
                        className="w-full text-[10px] font-black uppercase tracking-widest border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 hover:border-indigo-200 rounded-xl h-10 transition-all"
                    >
                        Auditoria de Votos
                    </HabitaButton>
                )}
            </HabitaCardFooter>
        </HabitaCard>
    );
}

export function PollList() {
    const { tenantId } = useApp();
    const { profile, user, isAdmin, accessProfile } = useAuth();
    const canViewDetails = isAdmin || hasPermission(accessProfile, 'polls', 'all');

    const [polls, setPolls] = useState<Poll[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPollForAudit, setSelectedPollForAudit] = useState<Poll | null>(null);

    useEffect(() => {
        if (!tenantId) return;

        // Usar CondoService em vez de onSnapshot direto
        const unsub = condoService.listenPolls(
            (data) => {
                setPolls(data);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Erro ao carregar enquetes:', err);
                setError('Erro ao carregar enquetes. Tente novamente.');
                setLoading(false);
            }
        );

        return () => unsub();
    }, [tenantId]);

    const activePolls = polls.filter(p => p.status === 'active' && new Date(p.endDate) > new Date());
    const closedPolls = polls.filter(p => p.status === 'closed' || new Date(p.endDate) <= new Date());

    if (loading) {
        return (
            <div className="py-32 flex flex-col items-center gap-6">
                <HabitaSpinner size="xl" />
                <div className="flex flex-col items-center text-center">
                    <span className="text-[11px] text-slate-900 font-black uppercase tracking-[0.2em] mb-1">Sincronizando Assembleia</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse italic">Aguardando dados da nuvem...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                <div className="p-8 bg-rose-50 text-rose-600 rounded-[2rem] border border-rose-100 shadow-xl shadow-rose-500/5 animate-in zoom-in duration-700">
                    <BarChart2 size={48} strokeWidth={1.5} />
                </div>
                <div className="space-y-3">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Erro ao Carregar</h3>
                    <p className="text-slate-500 max-w-sm font-semibold leading-relaxed">
                        {error}
                    </p>
                </div>
                <HabitaButton variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                    Tentar Novamente
                </HabitaButton>
            </div>
        );
    }

    if (polls.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                <div className="p-8 bg-slate-50 text-slate-400 rounded-[2rem] border border-slate-100/50 shadow-xl animate-in zoom-in duration-700">
                    <BarChart2 size={48} strokeWidth={1.5} />
                </div>
                <div className="space-y-3">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Nenhuma Enquete</h3>
                    <p className="text-slate-500 max-w-sm font-semibold leading-relaxed uppercase tracking-widest text-[10px]">
                        Não há votações ativas ou registros anteriores neste condomínio.
                    </p>
                </div>
            </div>
        );
    }

    // Determinar unitId: unit vinculada, uid do user ou fallback
    const currentUnitId = profile?.unitId || user?.uid || 'admin-system';

    return (
        <div className="space-y-12">
            {activePolls.length > 0 && (
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="relative">
                            <div className="w-3 h-3 rounded-full bg-blue-500 animate-ping absolute" />
                            <div className="w-3 h-3 rounded-full bg-blue-500 relative" />
                        </div>
                        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">
                            Votações em Aberto
                        </h2>
                        <div className="h-px bg-slate-100 flex-1" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {activePolls.map(poll => (
                            <PollCard key={poll.id} poll={{...poll, onAudit: setSelectedPollForAudit}} currentUnitId={currentUnitId} canViewDetails={canViewDetails} />
                        ))}
                    </div>
                </section>
            )}

            {closedPolls.length > 0 && (
                <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="flex items-center gap-3 mb-6">
                        <CheckSquare size={16} className="text-slate-300" />
                        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">
                            Resultados & Arquivo
                        </h2>
                        <div className="h-px bg-slate-100 flex-1" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 opacity-70 hover:opacity-100 transition-opacity duration-500">
                        {closedPolls.map(poll => (
                            <PollCard key={poll.id} poll={{...poll, onAudit: setSelectedPollForAudit}} currentUnitId={currentUnitId} canViewDetails={canViewDetails} />
                        ))}
                    </div>
                </section>
            )}

            {selectedPollForAudit && (
                <PollDetailsModal
                    poll={selectedPollForAudit}
                    isOpen={!!selectedPollForAudit}
                    onClose={() => setSelectedPollForAudit(null)}
                />
            )}
        </div>
    );
}
