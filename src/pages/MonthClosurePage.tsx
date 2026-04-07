import React, { useState, useMemo, useEffect } from 'react';
import {
    Shield,
    AlertTriangle,
    CheckCircle2,
    ArrowRight,
    TrendingUp,
    TrendingDown,
    Scale,
    Lock,
    Unlock,
    ChevronLeft,
    ChevronRight,
    Lock as ShieldLock,
    DollarSign,
    FileDown
} from 'lucide-react';
import { useApp, useAuth, useNotification as useToast } from '../contexts';
import adminService from '../services/AdminService';
import api from '../services/api';

import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { HabitaStatGrid } from '../components/ui/HabitaStatGrid';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaMonthPicker } from '../components/ui/HabitaMonthPicker';
import { HabitaCard, HabitaCardHeader, HabitaCardTitle } from '../components/ui/HabitaCard';
import { HabitaHeading } from '../components/ui/HabitaHeading';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { generateMonthlyReport } from '../utils/PDFReportUtils';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const MonthClosurePage: React.FC = () => {
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(`${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [realBankBalance, setRealBankBalance] = useState<number | ''>('');
    const [realCashBalance, setRealCashBalance] = useState<number | ''>('');
    const [apiStats, setApiStats] = useState<any>(null);


    const selectedDate = useMemo(() => new Date(selectedMonth + '-02'), [selectedMonth]);

    const {
        closures,
        balances,
        bankAccounts,
        addMonthClosure,
        deleteMonthClosure
    } = useApp();

    const { isAdmin, profile } = useAuth();
    const { showToast } = useToast();

    const refMonth = useMemo(() => {
        const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
        const year = selectedDate.getFullYear();
        return `${month}/${year}`;
    }, [selectedDate]);

    const closureId = useMemo(() => {
        const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
        const year = selectedDate.getFullYear();
        return `${month}-${year}`;
    }, [selectedDate]);

    const prevMonthRef = useMemo(() => {
        const prevDate = new Date(selectedDate);
        prevDate.setMonth(prevDate.getMonth() - 1);
        const month = (prevDate.getMonth() + 1).toString().padStart(2, '0');
        const year = prevDate.getFullYear();
        return `${month}/${year}`;
    }, [selectedDate]);

    const isClosed = adminService.isMonthClosed(closureId, closures);



    useEffect(() => {
        if (isClosed) {
            const currentClosure = closures.find(c => c.id === closureId);
            if (currentClosure) {
                setRealBankBalance(currentClosure.realBankBalance ?? 0);
                setRealCashBalance(currentClosure.realCashBalance ?? 0);
            }
        } else {
            // Se o saldo for undefined ou zero no balances, tenta pegar da soma das contas bancárias
            const currentBankSum = bankAccounts
                .filter(a => a.status === 'ativa' && a.type !== 'investimento')
                .reduce((acc, a) => acc + (a.currentBalance || 0), 0);
            
            const currentCashSum = bankAccounts
                .filter(a => a.status === 'ativa' && a.name.toLowerCase().includes('caixa'))
                .reduce((acc, a) => acc + (a.currentBalance || 0), 0);

            setRealBankBalance(balances.bank ?? (currentBankSum > 0 ? currentBankSum : ''));
            setRealCashBalance(balances.cash ?? (currentCashSum > 0 ? currentCashSum : ''));
        }
    }, [selectedDate, isClosed, closures, closureId, balances, bankAccounts]);

    useEffect(() => {
        const fetchStats = async () => {

            try {
                const [y, m] = selectedMonth.split('-');
                const res = await api.get(`/financial?month=${m}&year=${y}`);
                if (res.data?.success) {
                    setApiStats(res.data.data);
                }
            } catch (e) {
                console.error('Error fetching financial summary:', e);
            }
        };
        fetchStats();
    }, [selectedMonth]);

    const handlePrevMonth = () => {
        const d = new Date(selectedDate);
        d.setMonth(d.getMonth() - 1);
        setSelectedMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
    };

    const handleNextMonth = () => {
        const d = new Date(selectedDate);
        d.setMonth(d.getMonth() + 1);
        setSelectedMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
    };

    const displayStats = useMemo(() => {
        if (isClosed) {
            const snap = closures.find(c =>
                c.id === closureId ||
                c.id.endsWith(`_${closureId}`) ||
                c.referenceMonth === refMonth
            );
            if (snap) {
                return {
                    hasGas: snap.hasGasSnapshot,
                    incomes: snap.totalIncomes,
                    expenses: snap.totalExpenses,
                    balance: (snap.totalIncomes || 0) - (snap.totalExpenses || 0),
                    initialBalance: snap.initialBalance || 0,
                    projectedBalance: snap.projectedBalance || snap.finalBalance
                };
            }
        }
        
        let initialBalance = 0;
        if (apiStats?.initialBalance) {
            initialBalance = apiStats.initialBalance;
        } else {
            // Tenta encontrar o fechamento do mês anterior
            const prevClosure = closures.find(c => c.referenceMonth === prevMonthRef || c.id === prevMonthRef.replace('/', '-'));
            if (prevClosure) {
                initialBalance = prevClosure.projectedBalance || prevClosure.finalBalance || 0;
            } else {
                // Se não tem fechamento anterior, usa a soma dos saldos iniciais das contas
                initialBalance = bankAccounts.reduce((acc, b) => acc + (b.initialBalance || 0), 0);
            }
        }

        if (apiStats) {
            return {
                hasGas: (apiStats.historyCount || 0) > 0,
                incomes: apiStats.totalRevenues || 0,
                expenses: apiStats.totalExpenses || 0,
                balance: apiStats.monthBalance || 0,
                initialBalance,
                projectedBalance: initialBalance + (apiStats.totalRevenues || 0) - (apiStats.totalExpenses || 0)
            };
        }

        return {
            hasGas: false,
            incomes: 0,
            expenses: 0,
            balance: 0,
            initialBalance: 0,
            projectedBalance: 0
        };
    }, [isClosed, closures, closureId, apiStats, refMonth, prevMonthRef, bankAccounts]);

    const difference = useMemo(() => {
        const bank = typeof realBankBalance === 'number' ? realBankBalance : 0;
        const cash = typeof realCashBalance === 'number' ? realCashBalance : 0;
        return displayStats.projectedBalance - (bank + cash);
    }, [realBankBalance, realCashBalance, displayStats.projectedBalance]);

    const handleConcludeClosure = async () => {
        setIsGenerating(true);
        try {
            const result = await adminService.createMonthSnapshot(
                {
                    referenceMonth: refMonth,
                    closedBy: profile?.name || 'Administrador',
                    realBankBalance: typeof realBankBalance === 'number' ? realBankBalance : 0,
                    realCashBalance: typeof realCashBalance === 'number' ? realCashBalance : 0,
                    // Enviamos o valor calculado com fallback para garantir snapshot correto
                    initialBalance: displayStats.initialBalance,
                    totalIncomes: displayStats.incomes,
                    totalExpenses: displayStats.expenses,
                    projectedBalance: displayStats.projectedBalance
                }
            );

            if (result.success && result.data) {
                await addMonthClosure(result.data);
                showToast('Mês encerrado e snapshot gerado!', 'success');
                setIsConfirmModalOpen(false);
            } else {
                showToast(result.error || 'Falha ao encerrar mês.', 'error');
            }
        } catch (error) {
            console.error('Error closing month:', error);
            showToast('Falha ao encerrar mês.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="w-full animate-in fade-in duration-500 pb-16">
            <HabitaContainer>
                <HabitaContainerHeader 
                    title="Encerramento de Mês"
                    subtitle="Consolidação financeira e snapshot de segurança"
                    icon={<ShieldLock size={24} />}
                    actions={
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            {isClosed ? (
                                <div className="flex flex-col items-end">
                                    <HabitaBadge variant="success" className="mb-1">
                                        <CheckCircle2 size={12} className="mr-1.5" />
                                        Mês Protegido
                                    </HabitaBadge>
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                                        Consolidado em {new Date(closures.find(c => c.id === closureId)?.closedAt || '').toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                            ) : (
                                <HabitaBadge variant="indigo" className="animate-pulse">
                                    Aguardando Encerramento
                                </HabitaBadge>
                            )}
                        </div>
                    }
                />

                <div className="bg-white border-b border-slate-100 p-5 md:px-8">
                    <div className="flex flex-col md:flex-row items-stretch md:items-end gap-3 py-2">
                        <div className="w-full md:w-72">
                            <HabitaMonthPicker
                                label="Período de Referência"
                                value={selectedMonth}
                                onChange={setSelectedMonth}
                            />
                        </div>
                        <div className="flex gap-2">
                            <HabitaButton variant="outline" size="sm" onClick={handlePrevMonth} className="h-10 px-3">
                                <ChevronLeft size={16} />
                            </HabitaButton>
                            <HabitaButton variant="outline" size="sm" onClick={handleNextMonth} className="h-10 px-3">
                                <ChevronRight size={16} />
                            </HabitaButton>
                        </div>
                    </div>
                </div>

                <HabitaContainerContent padding="none">
                    <div className="p-3 md:p-8 flex flex-col gap-4 md:gap-8">
                        {/* Sumário Financeiro - Unified Grid */}
                        <HabitaStatGrid 
                            title="Sumário Financeiro do Período"
                            icon={<DollarSign className="text-emerald-500" />}
                            metrics={[
                                {
                                    label: "ENTRADAS PERÍODO",
                                    value: displayStats.incomes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                    icon: <TrendingUp />,
                                    variant: "emerald",
                                    subtext: "Receitas Consolidadas"
                                },
                                {
                                    label: "SAÍDAS PERÍODO",
                                    value: displayStats.expenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                    icon: <TrendingDown />,
                                    variant: "rose",
                                    subtext: "Total já Liquidado"
                                },
                                {
                                    label: "BALANÇO MENSAL",
                                    value: displayStats.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                    icon: <Scale />,
                                    variant: displayStats.balance >= 0 ? "indigo" : "amber",
                                    subtext: displayStats.balance >= 0 ? "Superávit do Mês" : "Déficit do Mês"
                                },
                                {
                                    label: "SALDO PROJETADO",
                                    value: displayStats.projectedBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                    icon: <CheckCircle2 />,
                                    variant: "slate",
                                    subtext: "Projeção de Fechamento"
                                }
                            ]}
                            cols={4}
                        />

                        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-8">
                            {/* 2. Checklist de Preparação */}
                            <div className="w-full lg:col-span-8 space-y-6">
                                <HabitaCard variant="white" padding="md" className="md:p-6">
                                    <HabitaCardHeader className="mb-6">
                                        <HabitaCardTitle className="flex items-center gap-2">
                                            <Shield size={14} className="text-blue-600" />
                                            Status de Preparação do Sistema
                                        </HabitaCardTitle>
                                    </HabitaCardHeader>

                                    <div className="space-y-6">
                                        {/* Gas Check */}
                                        <div className={cn(
                                            "p-4 md:p-5 rounded-xl border flex flex-col sm:flex-row gap-4 sm:gap-5 transition-all",
                                            displayStats.hasGas ? "bg-emerald-50/50 border-emerald-100" : "bg-amber-50/50 border-amber-100"
                                        )}>
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm",
                                                displayStats.hasGas ? "bg-white text-emerald-500 border-emerald-100" : "bg-white text-amber-500 border-amber-100"
                                            )}>
                                                {displayStats.hasGas ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-sm text-slate-800 tracking-tight">Apuração de Consumo (Gás)</h3>
                                                    {displayStats.hasGas && <HabitaBadge variant="success" size="xs">CONCLUÍDO</HabitaBadge>}
                                                </div>
                                                <p className="text-xs text-slate-500 leading-relaxed">
                                                    {displayStats.hasGas
                                                        ? 'Apuração detectada e finalizada para este período. O consumo já está integrado ao balanço financeiro.'
                                                        : 'Atenção: Nenhuma apuração de gás consolidada para este mês.'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Conciliação de Saldos */}
                                        <div className="p-4 md:p-6 rounded-xl border border-slate-100 bg-slate-50/30">
                                            <div className="flex gap-4 mb-4 md:mb-6">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200">
                                                    <Scale size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-sm text-slate-800 tracking-tight">Conciliação de Saldos</h3>
                                                    <p className="text-xs text-slate-500 mt-0.5">Validação entre o saldo projetado e os valores informados.</p>
                                                </div>
                                            </div>

                                            <div className={cn("space-y-4", "md:bg-white md:p-4 md:rounded-xl md:border md:border-slate-200 md:shadow-sm")}>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
                                                    <div className="space-y-1">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Saldo Inicial</span>
                                                        <p className="text-base md:text-lg font-bold text-slate-700">{displayStats.initialBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">Saldo Projetado</span>
                                                        <p className="text-base md:text-lg font-bold text-indigo-600">{displayStats.projectedBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                                    <div>
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Brasil (Bancário)</span>
                                                        <div className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                                                            {typeof realBankBalance === 'number' ? realBankBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Caixa Físico</span>
                                                        <div className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                                                            {typeof realCashBalance === 'number' ? realCashBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Divergência Feedback */}
                                                {difference === 0 ? (
                                                    <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50/50 text-emerald-700 rounded-lg border border-emerald-100 mt-2">
                                                        <CheckCircle2 size={16} className="shrink-0" />
                                                        <span className="text-xs font-bold">Os saldos conferem perfeitamente. Fluxo de caixa consistente.</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 mt-2">
                                                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                                        <span className="text-xs font-bold">
                                                            Divergência de {Math.abs(difference).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Recomenda-se revisar os lançamentos.
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </HabitaCard>
                            </div>

                            {/* 3. Bloco de Ação - Status Lock */}
                            <div className="w-full lg:col-span-4 lg:h-full">
                                <HabitaCard variant={isClosed ? "white" : "indigo"} className={cn("lg:h-full flex flex-col items-center justify-center text-center md:p-6 lg:p-8", isClosed ? "bg-slate-50" : "shadow-indigo-200")} padding="md">
                                    <div className={cn(
                                        "w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center mb-6 border shadow-lg transition-transform hover:scale-105 duration-500",
                                        isClosed 
                                            ? "bg-white text-emerald-500 border-emerald-100" 
                                            : "bg-white/10 text-white border-white/20 backdrop-blur-sm"
                                    )}>
                                        {isClosed ? <Lock className="w-8 h-8 md:w-10 md:h-10" /> : <Shield className="w-8 h-8 md:w-10 md:h-10" />}
                                    </div>

                                    {isClosed ? (
                                        <>
                                            <HabitaHeading level={3} className="text-slate-800 mb-2">Período Consolidado</HabitaHeading>
                                            <p className="text-slate-500 text-xs leading-relaxed mb-8 px-4">
                                                Este mês está protegido por snapshot. O sistema bloqueou edições em faturas, despesas e rubricas para garantir a imutabilidade da prestação de contas.
                                            </p>
                                            <div className="flex items-center gap-2 px-6 py-2 bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200 mb-8">
                                                <CheckCircle2 size={16} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Snapshot Ativo e Seguro</span>
                                            </div>

                                            {isAdmin && (
                                                <div className="flex flex-col gap-2 w-full px-4">
                                                    <HabitaButton
                                                        variant="primary"
                                                        onClick={() => generateMonthlyReport({
                                                            referenceMonth: refMonth,
                                                            initialBalance: displayStats.initialBalance,
                                                            includeReceipts: true
                                                        })}
                                                        className="w-full h-11 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100"
                                                        icon={<FileDown size={14} />}
                                                    >
                                                        Imprimir Fechamento
                                                    </HabitaButton>
                                                    <HabitaButton
                                                        variant="ghost"
                                                        onClick={() => setIsUnlockModalOpen(true)}
                                                        className="w-full h-8 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                        icon={<Unlock size={14} />}
                                                    >
                                                        Destravar Período
                                                    </HabitaButton>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <h2 className="text-xl md:text-2xl font-black text-white mb-3">Snapshot Crítico</h2>
                                            <p className="text-indigo-100 text-xs leading-relaxed mb-8 px-4 opacity-90">
                                                Ao encerrar o mês, você gera uma cópia imutável de todas as finanças. Esta ação consolida a prestação de contas do período.
                                            </p>
                                            <HabitaButton
                                                onClick={() => setIsConfirmModalOpen(true)}
                                                variant="secondary"
                                                className="w-full h-14 bg-white text-indigo-600 hover:bg-slate-50 border-none shadow-xl transform transition-all active:scale-95 text-xs font-black uppercase tracking-widest"
                                                icon={<ArrowRight size={18} />}
                                            >
                                                Encerrar Mês e Congelar
                                            </HabitaButton>
                                            <p className="mt-4 text-[9px] text-indigo-300 font-bold uppercase tracking-widest">Ação Provisoriamente Irreversível</p>
                                        </>
                                    )}
                                </HabitaCard>
                            </div>
                        </div>
                    </div>
                </HabitaContainerContent>
            </HabitaContainer>

            {/* Modal de Confirmação */}
            <HabitaModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                title="Confirmar Encerramento"
                size="sm"
                footer={
                    <>
                        <HabitaButton variant="outline" onClick={() => setIsConfirmModalOpen(false)} disabled={isGenerating}>
                            Cancelar
                        </HabitaButton>
                        <HabitaButton onClick={handleConcludeClosure} isLoading={isGenerating} icon={<Shield size={16} />}>
                            Confirmar Encerramento
                        </HabitaButton>
                    </>
                }
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-amber-100">
                        <AlertTriangle size={32} />
                    </div>
                    <HabitaHeading level={3} className="mb-2">Atenção com Snapshot</HabitaHeading>
                    <p className="text-slate-500 text-xs leading-relaxed">
                        Você está prestes a aplicar o Snapshot em <span className="font-bold text-slate-700">{refMonth}</span>. Isso bloqueará edições de lançamentos para garantir uma prestação de contas imutável e segura para os moradores.
                    </p>
                </div>
            </HabitaModal>

            {/* Modal de Confirmação de Destrava */}
            <HabitaModal
                isOpen={isUnlockModalOpen}
                onClose={() => setIsUnlockModalOpen(false)}
                title="Destravar Período?"
                size="sm"
                footer={
                    <div className="flex gap-3 w-full sm:w-auto">
                        <HabitaButton variant="outline" onClick={() => setIsUnlockModalOpen(false)} disabled={isUnlocking}>
                            Manter Travado
                        </HabitaButton>
                        <HabitaButton 
                            variant="danger" 
                            onClick={async () => {
                                setIsUnlocking(true);
                                try {
                                    const result = await adminService.deleteMonthSnapshot(closureId);
                                    if (result.success) {
                                        await deleteMonthClosure(closureId);
                                        showToast('Período destravado com sucesso.', 'success');
                                        setIsUnlockModalOpen(false);
                                    } else {
                                        showToast(result.error || 'Erro ao reabrir mês.', 'error');
                                    }
                                } finally {
                                    setIsUnlocking(false);
                                }
                            }} 
                            isLoading={isUnlocking}
                            icon={<Unlock size={16} />}
                        >
                            Destravar Mês
                        </HabitaButton>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-rose-100">
                        <AlertTriangle size={32} />
                    </div>
                    <HabitaHeading level={3} className="text-slate-800 mb-2">Ação Crítica</HabitaHeading>
                    <p className="text-slate-500 text-xs leading-relaxed">
                        ATENÇÃO: Reabrir o mês removerá o <span className="font-bold text-rose-600">snapshot de segurança</span> e permitirá edições novamente nos lançamentos financeiros de <span className="font-bold">{refMonth}</span>. Deseja continuar?
                    </p>
                </div>
            </HabitaModal>
        </div>
    );
};
