import { useState } from 'react';
import { useApp, type Expense, type Revenue } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { parseOfx, type OfxTransaction } from '../utils/OfxUtils.ts';
import {
    FileText, CheckCircle2, AlertCircle, ArrowRight,
    PlusCircle, Calendar, DollarSign, RefreshCcw, LayoutDashboard, ShieldAlert
} from 'lucide-react';
import { useCategories } from '../hooks/useCategories.ts';
import { hasPermission } from '../utils/rbac';
import { useToast } from '../contexts/ToastContext';
import { adminService } from '../services/AdminService';

// UI Components
import { HabitaCard, HabitaCardTitle } from '../components/ui/HabitaCard';
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaHeading } from '../components/ui/HabitaHeading';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaCombobox } from '../components/ui/HabitaCombobox';
import { HabitaSpinner } from '../components/ui/HabitaSpinner';
import { HabitaFileUpload } from '../components/ui/HabitaFileUpload';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaCheckbox } from '../components/ui/HabitaForm';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface MatchedTransaction extends OfxTransaction {
    systemMatches: {
        id: string;
        description: string;
        amount: number;
        date: string;
        type: 'expense' | 'revenue';
        conciliated?: boolean;
        bankTransactionId?: string;
        isVirtual?: boolean;
        historyId?: string;
        unitId?: string;
        isNew?: boolean; // Indicates the item should be created upon save
    }[];
    isConciliated: boolean; // Bank transaction ID already in system
    hasSuggestion: boolean; // System found a potential match
}

export function ReconciliationPage() {
    const {
        expenses, revenues, addExpense, addRevenue,
        isLoading, bulkUpdateExpenses, bulkUpdateRevenues,
        reconciliationPool,
        history, updateHistoryRecord
    } = useApp();
    const { accessProfile } = useAuth();
    const canManageReconciliation = hasPermission(accessProfile, 'reconciliation', 'all');
    const { incomeCategories, expenseCategories } = useCategories();

    const [ofxTransactions, setOfxTransactions] = useState<MatchedTransaction[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<Record<string, string>>({});
    const [selectedMultiIds, setSelectedMultiIds] = useState<Record<string, string[]>>({});
    const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

    const { showToast } = useToast();
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [transactionsToFinalize, setTransactionsToFinalize] = useState<MatchedTransaction[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    if (!canManageReconciliation) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <div className="p-4 bg-amber-50 text-amber-600 rounded border border-amber-100 shadow-sm">
                    <ShieldAlert size={48} />
                </div>
                <h1 className="text-2xl font-bold text-slate-800">Acesso Restrito</h1>
                <p className="text-slate-500 max-w-md">
                    Você não tem permissão para acessar a conciliação bancária.
                </p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <HabitaSpinner size="lg" />
            </div>
        );
    }


    const toggleMultiSelect = (bankTransId: string, systemRecordId: string) => {
        setSelectedMultiIds(prev => {
            const current = prev[bankTransId] || [];
            if (current.includes(systemRecordId)) {
                return { ...prev, [bankTransId]: current.filter(id => id !== systemRecordId) };
            }
            return { ...prev, [bankTransId]: [...current, systemRecordId] };
        });
    };

    const handleLaunch = async (trans: MatchedTransaction) => {
        const categoryId = selectedCategories[trans.id];
        if (!categoryId) {
            showToast("Por favor, selecione uma rubrica para este lançamento.", "warning");
            return;
        }

        const categoryName = ((trans as any).type === 'DEBIT' ? expenseCategories : incomeCategories)
            .find((c: any) => c.id === categoryId)?.name || 'Sem Rubrica';

        const newEntry = {
            id: crypto.randomUUID(),
            date: (trans as any).date,
            description: (trans as any).description,
            amount: (trans as any).amount,
            category: categoryName,
            conciliated: true,
            conciliatedAt: new Date().toISOString(),
            bankTransactionId: trans.id,
            isNew: true
        };

        setOfxTransactions(prev => prev.map(t =>
            t.id === trans.id ? {
                ...t,
                isConciliated: false,
                hasSuggestion: true,
                systemMatches: [{ ...newEntry, type: (trans.type === 'DEBIT' ? 'expense' : 'revenue') as 'expense' | 'revenue' }]
            } : t
        ));

        setSelectedCategories(prev => {
            const next = { ...prev };
            delete next[trans.id];
            return next;
        });
    };

    const confirmReconciliationAction = () => {
        // Items that have a system match and are not yet conciliated for this bank ID
        const autoConciliated = ofxTransactions.filter(t => !t.isConciliated && t.systemMatches.length > 0);

        // Items marked via Multi-Select
        const multiConciliated: MatchedTransaction[] = [];
        for (const trans of ofxTransactions) {
            if (!trans.isConciliated) {
                const selectedIds = selectedMultiIds[trans.id] || [];
                if (selectedIds.length > 0) {
                    const pool = trans.type === 'DEBIT' ? expenses : (reconciliationPool || []);
                    const selectedRecords = pool.filter((r: any) => selectedIds.includes(r.id));

                    // Robust sum check with parseFloat and 2-cent window
                    const currentSum = selectedRecords.reduce((sum, r) => sum + Math.abs(parseFloat(String(r.amount))), 0);
                    const diff = Math.abs(currentSum - trans.amount);

                    if (diff <= 0.02) {
                        multiConciliated.push({
                            ...trans,
                            systemMatches: selectedRecords.map(r => ({
                                ...r,
                                type: trans.type === 'DEBIT' ? 'expense' : 'revenue'
                            }))
                        });
                    }
                }
            }
        }

        const allToFinalize = [...autoConciliated, ...multiConciliated];

        if (allToFinalize.length === 0) {
            showToast("Nenhuma transação conciliada ou selecionada para finalizar.", "warning");
            return;
        }

        setTransactionsToFinalize(allToFinalize);
        setIsConfirmModalOpen(true);
    };

    const executeFinalization = async () => {
        if (transactionsToFinalize.length === 0) return;
        setIsSaving(true);
        const today = new Date().toISOString();
        const expensesToUpdate: Expense[] = [];
        const revenuesToUpdate: Revenue[] = [];
        const newExpenses: Expense[] = [];
        const newRevenues: Revenue[] = [];

        const historyUpdates: Record<string, { unitId: string, conciliatedAt: string, bankTransactionId: string }[]> = {};

        for (const trans of transactionsToFinalize) {
            const updateData = {
                conciliated: true,
                conciliatedAt: today,
                bankTransactionId: trans.id
            };

            for (const match of trans.systemMatches) {
                if (match.isNew) {
                    if (match.type === 'expense') {
                        newExpenses.push(match as any);
                    } else {
                        newRevenues.push(match as any);
                    }
                } else if (match.type === 'expense') {
                    const original = expenses.find(e => e.id === match.id);
                    if (original) expensesToUpdate.push({ ...original, ...updateData });
                } else {
                    // Check if it's a virtual revenue (unit payment from history)
                    if ((match as any).isVirtual) {
                        const vm = match as any;
                        if (!historyUpdates[vm.historyId]) historyUpdates[vm.historyId] = [];
                        historyUpdates[vm.historyId].push({
                            unitId: vm.unitId,
                            conciliatedAt: today,
                            bankTransactionId: trans.id
                        });
                    } else {
                        const original = revenues.find(r => r.id === match.id);
                        if (original) revenuesToUpdate.push({ ...original, ...updateData });
                    }
                }
            }
        }

        // Apply Batched History Updates via AdminService
        for (const [historyId, updates] of Object.entries(historyUpdates)) {
            let record = history.find((h: any) => h.id === historyId);
            if (record) {
                for (const update of updates) {
                    const updatedRecord = adminService.prepareUnitConciliation({
                        historyId,
                        unitId: update.unitId,
                        conciliatedAt: update.conciliatedAt,
                        bankTransactionId: update.bankTransactionId,
                        history: record ? [record] : []
                    });
                    if (updatedRecord) {
                        record = updatedRecord; // chain updates on same record
                    }
                }
                if (record) {
                    await updateHistoryRecord(record.id, record);
                }
            }
        }

        if (expensesToUpdate.length > 0) await bulkUpdateExpenses(expensesToUpdate);
        if (revenuesToUpdate.length > 0) await bulkUpdateRevenues(revenuesToUpdate);

        // Add new entries
        for (const ne of newExpenses) {
            await addExpense(ne);
        }
        for (const nr of newRevenues) {
            await addRevenue(nr);
        }

        setOfxTransactions([]);
        setSelectedMultiIds({});
        setIsConfirmModalOpen(false);
        setTransactionsToFinalize([]);
        setIsSaving(false);
        showToast(`Conciliação de ${transactionsToFinalize.length} transações finalizada com sucesso!`, "success");
    };

    return (
        <div className="w-full animate-in fade-in duration-500 pb-16">
            {/* Grand Card Branco - Interface Unificada */}
            <HabitaCard padding="none" allowOverflow className="bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[80vh] overflow-visible">
                
                {/* Cabeçalho Unificado */}
                <div className="p-8 pb-8 bg-slate-50/20 border-b border-slate-100">
                    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 shadow-sm">
                                <RefreshCcw size={24} />
                            </div>
                            <div className="flex flex-col">
                                <HabitaHeading level={1} className="mb-0 text-slate-900 border-none p-0">
                                    Conciliação Bancária
                                </HabitaHeading>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Conformidade entre extrato OFX e registros do sistema</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <HabitaFileUpload
                                onFilesSelected={(files) => {
                                    if (files.length > 0) {
                                        const file = files[0];
                                        const reader = new FileReader();
                                        setIsProcessing(true);
                                        reader.onload = (event) => {
                                            const content = event.target?.result as string;
                                            const parsedTrans = parseOfx(content);
                                            const usedSystemIds = new Set<string>();

                                            const matched = parsedTrans.map(t => {
                                                const searchPool = (t.type === 'DEBIT' ? expenses : (reconciliationPool || [])) as (Expense | Revenue | any)[];

                                                const isWithinWindow = (dateStr: string, windowDays: number) => {
                                                    const systemDate = new Date(dateStr + 'T12:00:00');
                                                    const bankDateObj = new Date(t.date + 'T12:00:00');
                                                    const diffTime = Math.abs(systemDate.getTime() - bankDateObj.getTime());
                                                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                                                    return diffDays <= windowDays;
                                                };

                                                const matchAmount = (a1: number, a2: number) => Math.abs(Math.abs(a1) - Math.abs(a2)) < 0.01;

                                                const isGenericId = (id: string | undefined) =>
                                                    !id || id === '0' || id === 'NONE' || id.toLowerCase() === 'undefined' || id.toLowerCase() === 'null';

                                                let match = searchPool.find(e => {
                                                    if (usedSystemIds.has(e.id)) return false;
                                                    const systemBankId = e.bankTransactionId;
                                                    if (isGenericId(systemBankId)) return false;
                                                    const matchesId = (systemBankId === t.id || (t.originalFitId && systemBankId === t.originalFitId));
                                                    return matchesId && matchAmount(e.amount, t.amount) && isWithinWindow(e.date, 10);
                                                });

                                                if (!match) {
                                                    match = searchPool.find(e =>
                                                        !usedSystemIds.has(e.id) &&
                                                        matchAmount(e.amount, t.amount) &&
                                                        e.date === t.date &&
                                                        !e.bankTransactionId
                                                    );
                                                }

                                                if (!match) {
                                                    match = searchPool.find(e =>
                                                        !usedSystemIds.has(e.id) &&
                                                        matchAmount(e.amount, t.amount) &&
                                                        isWithinWindow(e.date, 3) &&
                                                        !e.bankTransactionId
                                                    );
                                                }

                                                if (match) {
                                                    usedSystemIds.add(match.id);
                                                    const type = (t.type === 'DEBIT' ? 'expense' : 'revenue') as 'expense' | 'revenue';
                                                    const alreadyConciliated = !!(match.bankTransactionId === t.id || (t.originalFitId && match.bankTransactionId === t.originalFitId));

                                                    return {
                                                        ...t,
                                                        systemMatches: [{ ...match, type }],
                                                        isConciliated: alreadyConciliated,
                                                        hasSuggestion: !alreadyConciliated
                                                    };
                                                }

                                                return {
                                                    ...t,
                                                    systemMatches: [],
                                                    isConciliated: false,
                                                    hasSuggestion: false
                                                };
                                            });

                                            setOfxTransactions(matched);
                                            setIsProcessing(false);
                                        };
                                        reader.readAsText(file);
                                    }
                                }}
                                accept=".ofx"
                                isLoading={isProcessing}
                                description="Arraste o arquivo .ofx do seu banco"
                                containerClassName="w-72"
                                className="p-4"
                            />

                            {ofxTransactions.length > 0 && (
                                <HabitaButton
                                    variant="primary"
                                    size="sm"
                                    onClick={confirmReconciliationAction}
                                    className="h-11 px-8 bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200 shrink-0"
                                    icon={<CheckCircle2 size={18} />}
                                >
                                    Finalizar Conciliação
                                </HabitaButton>
                            )}
                        </div>
                    </header>
                </div>

                <div className="p-8">
                    {ofxTransactions.length === 0 ? (
                        <div className="py-24 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mb-6 border border-slate-100 shadow-inner">
                                <FileText size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Pronto para conciliar</h3>
                            <p className="text-slate-500 max-w-sm mt-2 text-sm">Arraste seu arquivo .ofx ou clique no botão acima para iniciar o processo de conferência bancária.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                            {/* LADO ESQUERDO: BANCO */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-2 mb-4">
                                    <HabitaCardTitle className="flex items-center gap-2">
                                        <DollarSign size={14} className="text-slate-300" /> Extrato Bancário
                                    </HabitaCardTitle>
                                    <HabitaBadge variant="neutral" size="sm" className="bg-slate-100 text-slate-500 border-none font-black px-3">
                                        {ofxTransactions.length} LANÇAMENTOS
                                    </HabitaBadge>
                                </div>

                                <div className="space-y-4">
                                    {ofxTransactions.map((trans) => (
                                        <HabitaCard key={trans.id} padding="md" allowOverflow className={cn(
                                            "transition-all duration-300 border-slate-100 hover:border-slate-200 shadow-none",
                                            trans.isConciliated ? 'bg-emerald-50/20 border-emerald-100' : 'bg-white'
                                        )}>
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <HabitaBadge 
                                                            variant={trans.type === 'DEBIT' ? 'error' : 'success'} 
                                                            size="sm" 
                                                            className="font-black text-[9px] px-2"
                                                        >
                                                            {trans.type === 'DEBIT' ? 'DÉBITO' : 'CRÉDITO'}
                                                        </HabitaBadge>
                                                        <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                                                            <Calendar size={12} className="opacity-60" /> {new Date(trans.date).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-slate-900 text-sm truncate leading-tight mb-1" title={trans.description}>{trans.description}</h4>
                                                    <p className="text-xl font-black text-slate-950 tracking-tight">
                                                        R$ {trans.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </p>
                                                </div>

                                                <div className="flex flex-col items-end gap-3">
                                                    {trans.isConciliated ? (
                                                        <div className="flex items-center gap-1.5 text-emerald-600 font-black text-[10px] bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 uppercase tracking-tighter">
                                                            <CheckCircle2 size={14} /> Conciliado
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-end gap-2 w-full">
                                                            {trans.hasSuggestion && (
                                                                <div className="flex items-center gap-1.5 text-indigo-500 font-black text-[9px] bg-indigo-50 px-2.5 py-1 rounded border border-indigo-100 uppercase tracking-tighter animate-pulse">
                                                                    Sugestão Encontrada
                                                                </div>
                                                            )}

                                                            <div className="flex flex-col items-end gap-2 w-full">
                                                                <HabitaCombobox
                                                                    options={(trans.type === 'DEBIT' ? expenseCategories : incomeCategories).map(cat => ({
                                                                        label: cat.name,
                                                                        value: cat.id
                                                                    }))}
                                                                    value={selectedCategories[trans.id] || ''}
                                                                    onChange={(val) => setSelectedCategories(prev => ({ ...prev, [trans.id]: val }))}
                                                                    placeholder="Lançar como Novo..."
                                                                    containerClassName="w-48"
                                                                />
                                                                
                                                                <div className="flex items-center gap-2">
                                                                    {trans.hasSuggestion && (
                                                                        <button
                                                                            onClick={() => setOfxTransactions(prev => prev.map(t => t.id === trans.id ? { ...t, hasSuggestion: false, systemMatches: [] } : t))}
                                                                            className="text-[9px] text-slate-400 hover:text-rose-500 font-black uppercase tracking-tighter transition-colors"
                                                                        >
                                                                            Trocar Match
                                                                        </button>
                                                                    )}
                                                                    <HabitaButton
                                                                        onClick={() => handleLaunch(trans)}
                                                                        variant="primary"
                                                                        size="sm"
                                                                        className="h-8 px-4 text-[10px] font-black uppercase tracking-widest bg-indigo-600 border-indigo-600 hover:bg-indigo-700 hover:border-indigo-700"
                                                                        icon={<PlusCircle size={14} />}
                                                                    >
                                                                        Lançar
                                                                    </HabitaButton>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* MOBILE SYSTEM MATCH (Inside the card on mobile, usually hidden on desktop) */}
                                            <div className="lg:hidden mt-4 pt-4 border-t border-slate-100">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <ArrowRight size={14} className="text-slate-300 rotate-90" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Correspondência</span>
                                                </div>
                                                {trans.systemMatches.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {trans.systemMatches.map(m => (
                                                            <div key={m.id} className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                                                <p className="text-[11px] font-bold text-slate-800">{m.description}</p>
                                                                <p className="text-[10px] font-black text-slate-500 mt-0.5 uppercase tracking-tighter">
                                                                    R$ {Math.abs(m.amount).toFixed(2)} • {m.date}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] text-slate-400 italic">Nenhum registro encontrado no sistema</p>
                                                )}
                                            </div>
                                        </HabitaCard>
                                    ))}
                                </div>
                            </div>

                            {/* LADO DIREITO: SISTEMA (DESKTOP) */}
                            <div className="hidden lg:block space-y-6">
                                <div className="flex items-center px-2 mb-4">
                                    <HabitaCardTitle className="flex items-center gap-2">
                                        <LayoutDashboard size={14} className="text-slate-300" /> Registros no Sistema
                                    </HabitaCardTitle>
                                </div>

                                <div className="space-y-4">
                                    {ofxTransactions.map((trans) => (
                                        <div key={`sys-${trans.id}`} className="flex items-center gap-6 group">
                                            <div className="flex-shrink-0 flex items-center justify-center w-8">
                                                <ArrowRight className={cn(
                                                    "transition-all duration-300",
                                                    trans.isConciliated ? 'text-emerald-400' : 'text-slate-200 group-hover:text-slate-400'
                                                )} />
                                            </div>

                                            <HabitaCard padding="md" className={cn(
                                                "flex-1 min-h-[120px] flex flex-col justify-center transition-all duration-300 border-slate-100 shadow-none",
                                                trans.isConciliated ? 'bg-emerald-50/10 border-emerald-100' : 'bg-slate-50/30'
                                            )}>
                                                {trans.isConciliated || trans.systemMatches.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {trans.systemMatches.map(m => (
                                                            <div key={m.id} className="relative last:border-0 border-b border-slate-100/50 pb-2 last:pb-0">
                                                                <div className="flex items-center justify-between mb-1.5">
                                                                    <HabitaBadge variant="neutral" size="sm" className="bg-white text-slate-400 border-slate-200 text-[8px] font-black px-1.5 h-4">
                                                                        {m.type === 'expense' ? 'DESPESA' : 'RECEITA'}
                                                                    </HabitaBadge>
                                                                    <span className="text-[10px] text-slate-400 font-black tracking-tighter bg-white px-1.5 border border-slate-100 rounded">
                                                                        {m.date}
                                                                    </span>
                                                                </div>
                                                                <h4 className="font-bold text-slate-800 text-xs leading-tight mb-1 truncate">{m.description}</h4>
                                                                <p className="text-sm font-black text-slate-950">
                                                                    R$ {Math.abs(m.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : expandedMatchId === trans.id ? (
                                                    <div className="flex flex-col gap-3 py-1">
                                                        <div className="max-h-[180px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                            {(trans.type === 'DEBIT'
                                                                ? expenses.filter(e => !e.conciliated && !e.conciliatedAt)
                                                                : (reconciliationPool || []).filter(r => !r.conciliated && !r.conciliatedAt)
                                                            ).map(candidate => {
                                                                const isChecked = (selectedMultiIds[trans.id] || []).includes(candidate.id);
                                                                return (
                                                                    <div 
                                                                        key={candidate.id} 
                                                                        className={cn(
                                                                            "flex items-center gap-3 border p-2.5 rounded-xl cursor-pointer transition-all group/cand shadow-sm mb-1.5 last:mb-0",
                                                                            isChecked 
                                                                                ? "bg-indigo-50/50 border-indigo-200" 
                                                                                : "bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50/50"
                                                                        )}
                                                                        onClick={() => toggleMultiSelect(trans.id, candidate.id)}
                                                                    >
                                                                        <HabitaCheckbox
                                                                            checked={isChecked}
                                                                            onChange={() => toggleMultiSelect(trans.id, candidate.id)}
                                                                            className="pointer-events-none"
                                                                        />
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{candidate.description}</p>
                                                                            <p className="text-[10px] font-black text-slate-400 leading-tight mt-1 uppercase tracking-tighter">
                                                                                R$ {Math.abs(candidate.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • {candidate.date || 'Sem data'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        <div className="flex items-center gap-3 pt-2">
                                                            <button
                                                                onClick={() => setExpandedMatchId(null)}
                                                                className="text-[10px] text-slate-400 font-extrabold hover:text-rose-500 uppercase tracking-widest px-2"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            {(selectedMultiIds[trans.id] || []).length > 0 && (() => {
                                                                const currentSum = (trans.type === 'DEBIT' ? expenses : reconciliationPool)
                                                                    .filter((r: any) => (selectedMultiIds[trans.id] || []).includes(r.id))
                                                                    .reduce((s: number, r: any) => s + Math.abs(parseFloat(String(r.amount))), 0);
                                                                const diff = Math.abs(currentSum - trans.amount);
                                                                const isValid = diff <= 0.02;

                                                                return (
                                                                    <div className={cn(
                                                                        "text-[10px] font-black px-3 py-2 rounded-lg flex-1 flex justify-between items-center border shadow-sm",
                                                                        isValid
                                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                                            : 'bg-amber-50 text-amber-700 border-amber-100'
                                                                    )}>
                                                                        <span className="uppercase tracking-tighter">Soma: R$ {currentSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                                        {!isValid && <span className="opacity-60 text-[9px]">(- R$ {diff.toFixed(2)})</span>}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center text-center py-6 px-4">
                                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3 italic">Sem correspondência ativa</p>
                                                        <HabitaButton
                                                            onClick={() => setExpandedMatchId(trans.id)}
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 px-5 border-indigo-100 bg-white text-indigo-600 hover:bg-indigo-50 text-[10px] font-black uppercase tracking-widest"
                                                        >
                                                            Match Manual
                                                        </HabitaButton>
                                                    </div>
                                                )}
                                            </HabitaCard>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Dicas de Conciliação - Banner Inferior */}
                <div className="p-8 pt-0 mt-4">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-start gap-4 shadow-xl">
                        <div className="p-2 bg-indigo-500/20 rounded-xl">
                            <AlertCircle className="text-indigo-400" size={24} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                Inteligência de Conciliação
                                <HabitaBadge variant="neutral" size="sm" className="bg-indigo-500/20 text-indigo-300 border-none text-[8px] h-4">HABITA AI</HabitaBadge>
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 mt-4">
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                        <p className="text-slate-400 text-[11px] leading-relaxed">O sistema busca automaticamente transações com o <strong>mesmo valor e data próxima (3 dias)</strong> para otimizar seu tempo.</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                        <p className="text-slate-400 text-[11px] leading-relaxed">Valores negativos no extrato são tratados como despesas; positivos como receitas.</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                        <p className="text-slate-400 text-[11px] leading-relaxed">Use o <strong>Match Manual</strong> caso o sistema não encontre o registro automaticamente (ex: pagamentos agrupados no mesmo dia).</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                        <p className="text-slate-400 text-[11px] leading-relaxed">A conciliação manual aceita diferenças de até <strong>2 centavos</strong> para compensar possíveis taxas ou arredondamentos bancários.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </HabitaCard>

            <HabitaModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                title="Confirmar Conciliação"
                size="sm"
                footer={
                    <div className="flex gap-3 w-full">
                        <HabitaButton variant="outline" onClick={() => setIsConfirmModalOpen(false)} disabled={isSaving} className="flex-1">Cancelar</HabitaButton>
                        <HabitaButton variant="primary" onClick={executeFinalization} isLoading={isSaving} className="flex-1">Finalizar Agora</HabitaButton>
                    </div>
                }
            >
                <div className="py-4 text-center space-y-4">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto border border-indigo-100 shadow-sm mb-4">
                        <RefreshCcw size={32} />
                    </div>
                    <p className="text-slate-600 font-medium leading-relaxed">
                        Deseja confirmar e finalizar a conciliação de <span className="font-bold text-slate-900">{transactionsToFinalize.length}</span> transações?<br/>
                        <span className="text-xs text-slate-400 mt-2 block italic">Transações marcadas como lançamentos novos serão adicionadas ao sistema permanentemente.</span>
                    </p>
                </div>
            </HabitaModal>
        </div>
    );
}
