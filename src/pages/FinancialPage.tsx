import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../services/api';
import { FileText, Plus, Check, Pencil, Trash2, Banknote, Settings2, Link as LinkIcon, ShieldAlert, DollarSign, MessageSquare, Save, Lock, TrendingUp, X, AlertTriangle } from 'lucide-react';
import { generateFinancialReport } from '../utils/PDFReportUtils';
import { ExtraFeesTab } from '../components/financial/ExtraFeesTab';
import { HabitaCard, HabitaCardHeader, HabitaCardTitle } from '../components/ui/HabitaCard';
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaTable, HabitaTHead, HabitaTBody, HabitaTR, HabitaTH, HabitaTD } from '../components/ui/HabitaTable';
import { HabitaHeading } from '../components/ui/HabitaHeading';
import { HabitaInput, HabitaTextarea } from '../components/ui/HabitaForm';
import { HabitaFileUpload } from '../components/ui/HabitaFileUpload';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaTabs } from '../components/ui/HabitaTabs';
import { HabitaMobileTabs } from '../components/ui/HabitaMobileTabs';
import { HabitaDatePicker } from '../components/ui/HabitaDatePicker';
import { HabitaStatGrid } from '../components/ui/HabitaStatGrid';
import { HabitaStatGrid3x1 } from '../components/ui/HabitaStatGrid3x1';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaCombobox } from '../components/ui/HabitaCombobox';
import { HabitaMonthPicker } from '../components/ui/HabitaMonthPicker';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { HabitaIconActionButton } from '../components/ui/HabitaIconActionButton';

import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useCategories } from '../hooks/useCategories';
import { hasPermission } from '../utils/rbac';

export function FinancialPage() {
    const { 
        expenses, 
        revenues, 
        balances, 
        bankAccounts, 
        settings, 
        virtualRevenues, 
        isMonthClosed,
        reloadCondoData 
    } = useApp();
    
    const { isAdmin, isSuperAdmin, accessProfile } = useAuth();
    const { showToast } = useToast();

    const { expenseCategories, incomeCategories } = useCategories();

    const isSindicoOrAdmin = isAdmin || isSuperAdmin;
    const canManageFinancial = hasPermission(accessProfile, 'financial', 'all') || isSindicoOrAdmin;
    const canViewFinancial = hasPermission(accessProfile, 'financial', 'own') || canManageFinancial;


    // Local State for Form
    const formRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'entries' | 'extra-fees'>('entries');
    const [entryType, setEntryType] = useState<'expense' | 'revenue'>('expense');
    const [newDesc, setNewDesc] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
    const [newAccount, setNewAccount] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isEditingCash, setIsEditingCash] = useState(false);
    const [isEditingBank, setIsEditingBank] = useState(false);
    const [isEditingReserve, setIsEditingReserve] = useState(false);
    const [globalMessage, setGlobalMessage] = useState(settings.mensagemGlobalFatura || '');
    const [isSavingMessage, setIsSavingMessage] = useState(false);
    const [isBankDetailsModalOpen, setIsBankDetailsModalOpen] = useState(false);
    const [editingBankId, setEditingBankId] = useState<string | null>(null);
    const [editBankBalanceValue, setEditBankBalanceValue] = useState('');
    
    // States for balance editing
    const [editCashValue, setEditCashValue] = useState('');
    const [editBankValue, setEditBankValue] = useState('');
    const [editReserveValue, setEditReserveValue] = useState('');
    const [isBalanceWarningOpen, setIsBalanceWarningOpen] = useState(false);

    // Sync local state when settings change (e.g., after loading from DB)
    useEffect(() => {
        if (settings.mensagemGlobalFatura !== undefined) {
            setGlobalMessage(settings.mensagemGlobalFatura || '');
        }
    }, [settings.mensagemGlobalFatura]);

    // Local State for Filter
    const [filterMonth, setFilterMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    });
    const [filterCategory, setFilterCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const isClosed = useMemo(() => {
        if (!filterMonth || typeof filterMonth !== 'string') return false;
        const parts = filterMonth.split('-');
        if (parts.length < 2) return false;
        const [year, month] = parts;
        return isMonthClosed?.(`${month}/${year}`) || false;
    }, [filterMonth, isMonthClosed]);

    if (!canViewFinancial) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <div className="p-4 bg-slate-50 text-slate-400 rounded-full">
                    <ShieldAlert size={48} />
                </div>
                <h1 className="text-xl font-bold text-slate-800">Acesso Restrito</h1>
                <p className="text-slate-500 text-sm">Você não tem permissão para visualizar o módulo financeiro.</p>
            </div>
        );
    }

    // Form & Filter state hooks are now moved to the top



    // --- Actions ---

    const handleAddEntry = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (isClosed) {
            showToast("Este mês está protegido por snapshot e não permite alterações.", "error");
            return;
        }
        if (!newDesc || !newAmount) return;

        const amount = parseFloat(newAmount) || 0;
        setIsUploading(true);
        try {
            let receiptUrl = '';
            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                const uploadRes = await api.post('/files/upload', formData);
                receiptUrl = uploadRes.data.url;
            } else if (editingEntryId) {
                const existing = entryType === 'expense'
                    ? expenses.find((e: any) => e.id === editingEntryId)
                    : revenues.find((r: any) => r.id === editingEntryId);
                receiptUrl = existing?.receiptUrl || '';
            }

            const data = {
                date: newDate,
                description: newDesc,
                amount: amount,
                category: newCategory || (entryType === 'expense' ? 'Geral' : 'Manual'),
                receiptUrl,
                account: newAccount
            };

            if (entryType === 'expense') {
                if (editingEntryId) {
                    await api.put(`/financial/expenses/${editingEntryId}`, data);
                } else {
                    await api.post('/financial/expenses', data);
                }
            } else {
                if (editingEntryId) {
                    await api.put(`/financial/revenues/${editingEntryId}`, data);
                } else {
                    await api.post('/financial/revenues', data);
                }
            }

            await reloadCondoData();
            showToast('Lançamento salvo com sucesso!', 'success');

            // Reset Form
            setNewDesc('');
            setNewAmount('');
            setNewCategory('');
            setNewAccount('');
            setFile(null);
            setEditingEntryId(null);
            setIsBalanceWarningOpen(false);
        } catch (error: any) {
            console.error("Error saving entry:", error);
            showToast("Erro ao salvar lançamento. Tente novamente.", "error");
        } finally {
            setIsUploading(false);
        }
    };

    const startEditing = (entry: any, type: 'expense' | 'revenue') => {
        if (isClosed) return;
        setEntryType(type);
        setNewDesc(entry.description);
        setNewAmount(entry.amount.toString());
        setNewCategory(entry.category || '');
        setNewDate(entry.date);
        setNewAccount(entry.account || '');
        setEditingEntryId(entry.id);
        
        // Desloca para o formulário de edição
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const cancelEditing = () => {
        setEditingEntryId(null);
        setNewDesc('');
        setNewAmount('');
        setNewCategory('');
        setNewAccount('bank');
        setNewDate(new Date().toISOString().split('T')[0]);
        setFile(null);
    };

    const handleSaveGlobalMessage = async () => {
        setIsSavingMessage(true);
        try {
            await api.put('/settings', {
                mensagemGlobalFatura: globalMessage
            });
            await reloadCondoData();
            showToast("Mensagem salva com sucesso!", "success");
        } catch (error) {
            console.error("Error saving global message:", error);
            showToast("Erro ao salvar mensagem.", "error");
        } finally {
            setIsSavingMessage(false);
        }
    };

    const handleSaveBankBalance = async (bankId: string) => {
        if (!editingBankId) return;
        const newBalance = parseFloat(editBankBalanceValue);
        if (isNaN(newBalance)) {
            showToast("Por favor, insira um valor numérico válido.", "error");
            return;
        }
    
        try {
            await api.put(`/bank-accounts/${bankId}`, { currentBalance: newBalance });
            await reloadCondoData();
    
            setEditingBankId(null);
            setEditBankBalanceValue('');
            showToast("Saldo da conta bancária atualizado com sucesso!", "success");
        } catch (error) {
            console.error("Error updating bank account balance:", error);
            showToast("Erro ao atualizar saldo da conta bancária. Tente novamente.", "error");
        }
    };

    // --- Derived Data ---
    const filteredExpenses = (expenses || [])
        .filter((e: any) => e && e.date && typeof e.date === 'string' && e.date.startsWith(filterMonth))
        .filter((e: any) => filterCategory === 'all' || e.category === filterCategory)
        .filter((e: any) => !searchTerm || (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase())))
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const totalExpenses = filteredExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);

    // 1. Automatic Revenues from History (Virtual)
    const historyRevenues = (virtualRevenues || [])
        .filter((r: any) => r && r.date && typeof r.date === 'string' && r.date.startsWith(filterMonth))
        .filter((r: any) => filterCategory === 'all' || r.category === filterCategory)
        .map((r: any) => ({ ...r, isManual: false }));

    // 2. Manual & Consolidated Revenues
    const manualRevenues = (revenues || [])
        .filter((r: any) => r && r.date && typeof r.date === 'string' && r.date.startsWith(filterMonth))
        .filter((r: any) => filterCategory === 'all' || r.category === filterCategory)
        // EXCLUDE the automated consolidated billing to avoid double counting if individual payments are shown
        .filter((r: any) => r.description && !r.description.includes('Faturamento Gás'))
        .map((r: any) => ({
            ...r,
            isManual: true
        }));

    // Combined Revenues
    const allRevenues = [...historyRevenues, ...manualRevenues]
        .filter((r: any) => r && (!searchTerm || (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase()))))
        .sort((a: any, b: any) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
        });

    const totalRevenues = allRevenues.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
    const totalBankBalance = bankAccounts.filter((b: any) => b.status === 'ativa').reduce((sum: number, b: any) => sum + (b.currentBalance || 0), 0);
    const totalBalance = (balances.cash || 0) + totalBankBalance;
    const periodBalance = totalRevenues - totalExpenses;

    // --- Chart Data Processing ---

    // --- PDF Generation Helpers ---

    // --- PDF Generation ---

    const generatePDF = async () => {
        setIsGeneratingPDF(true);
        try {
            const [year, month] = filterMonth.split('-');
            const reference = `${month}/${year}`;
            
            await generateFinancialReport({
                settings,
                referenceMonth: reference,
                expenses: filteredExpenses,
                revenues: allRevenues,
                categories: [...expenseCategories, ...incomeCategories],
                bankAccounts: bankAccounts || [],
                initialBalance: totalBalance - (totalRevenues - totalExpenses),
                includeReceipts: true
            });
        } catch (error) {
            console.error("PDF generation failed:", error);
            showToast("Erro ao gerar PDF detalhado. Verifique os dados e tente novamente.", "error");
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    return (
        <div className="w-full animate-in fade-in duration-500 pb-16">
            <HabitaContainer>
                <HabitaContainerHeader 
                    title="Financeiro"
                    subtitle="Gestão de Fluxo de Caixa e Conciliação Bancária"
                    icon={<DollarSign size={24} />}
                    iconVariant="emerald"
                    actions={
                        <HabitaButton
                            onClick={generatePDF}
                            disabled={(filteredExpenses.length === 0 && allRevenues.length === 0) || isGeneratingPDF}
                            variant="primary"
                            isLoading={isGeneratingPDF}
                            icon={<FileText size={16} />}
                            className="bg-slate-900 border-slate-900 shadow-lg shadow-slate-200"
                        >
                            Gerar Relatório PDF
                        </HabitaButton>
                    }
                />

                <div className="bg-white border-b border-slate-100 px-5 md:px-8">
                    <HabitaTabs 
                        tabs={[
                            { id: 'entries', label: 'Lançamentos', icon: <Banknote size={14} /> },
                            { id: 'extra-fees', label: 'Taxas Extras & Recorrentes', icon: <Settings2 size={14} /> },
                        ]}
                        activeTab={activeTab}
                        onChange={(id: string) => setActiveTab(id as any)}
                        className="mb-0 hidden md:flex"
                    />

                    <HabitaMobileTabs
                        tabs={[
                            { id: 'entries', label: 'Lançamentos', icon: <Banknote size={14} /> },
                            { id: 'extra-fees', label: 'Taxas Extras & Recorrentes', icon: <Settings2 size={14} /> },
                        ]}
                        activeTab={activeTab}
                        onChange={(id: string) => setActiveTab(id as any)}
                        className="md:hidden pb-4"
                        label="Área Financeira"
                    />
                </div>

                <HabitaContainerContent padding="none">
                    <div className="p-3 md:p-8 flex flex-col gap-4 md:gap-8">
                {activeTab === 'entries' ? (
                    <>
                        {/* 1. Summary Section - Unified Stat Grid */}
                        <div>
                            {/* Desktop Version */}
                            <div className="hidden md:block">
                                <HabitaStatGrid 
                                    title="Resumo do Período"
                                    icon={<TrendingUp />}
                                    metrics={[
                                        {
                                            label: "RECEITAS",
                                            value: totalRevenues.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                            icon: <TrendingUp />,
                                            variant: "emerald",
                                            subtext: "Entradas Totais"
                                        },
                                        {
                                            label: "DESPESAS",
                                            value: totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                            icon: <TrendingUp className="rotate-180" />,
                                            variant: "rose",
                                            subtext: "Saídas Gravadas"
                                        },
                                        {
                                            label: "RESULTADO",
                                            value: periodBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                            icon: <DollarSign />,
                                            variant: periodBalance >= 0 ? "indigo" : "amber",
                                            subtext: periodBalance >= 0 ? "Superávit" : "Déficit"
                                        }
                                    ]}
                                    cols={3}
                                />
                            </div>

                            {/* Mobile Version */}
                            <div className="md:hidden">
                                <HabitaStatGrid3x1 
                                    title="Resumo do Período"
                                    icon={<TrendingUp />}
                                    metrics={[
                                        {
                                            label: "RECEITAS",
                                            value: totalRevenues.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                            icon: <TrendingUp />,
                                            variant: "emerald",
                                            subtext: "Entradas Totais"
                                        },
                                        {
                                            label: "DESPESAS",
                                            value: totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                            icon: <TrendingUp className="rotate-180" />,
                                            variant: "rose",
                                            subtext: "Saídas Gravadas"
                                        },
                                        {
                                            label: "RESULTADO",
                                            value: periodBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                            icon: <DollarSign />,
                                            variant: periodBalance >= 0 ? "indigo" : "amber",
                                            subtext: periodBalance >= 0 ? "Superávit" : "Déficit"
                                        }
                                    ]}
                                />
                            </div>
                        </div>



                        {/* 2. Filter & Global Actions Section */}
                        <div className="grid grid-cols-12 gap-6 md:gap-8 md:pt-4">
                            <div className="col-span-12 lg:col-span-8 space-y-6">
                                <div className="flex flex-col md:flex-row items-stretch md:items-end gap-3 bg-slate-50 p-3 md:p-4 rounded-lg border border-slate-100">
                                    <div className="flex-1">
                                        <HabitaMonthPicker
                                            label="Mês de Referência"
                                            value={filterMonth}
                                            onChange={(val: string) => setFilterMonth(val)}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <HabitaCombobox
                                            label="Filtrar por Rubrica"
                                            value={filterCategory}
                                            onChange={(val: any) => setFilterCategory(val)}
                                            options={[
                                                { label: 'Todas as Rubricas', value: 'all' },
                                                ...expenseCategories.concat(incomeCategories).map((c: any) => ({
                                                    label: c.name,
                                                    value: c.name
                                                }))
                                            ]}
                                            searchable
                                        />
                                    </div>
                                    <div className="flex-[1.5]">
                                        <HabitaInput
                                            label="Pesquisar Descrição"
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e: any) => setSearchTerm(e.target.value)}
                                            placeholder="Buscar lançamentos..."
                                        />
                                    </div>
                                </div>

                                {isClosed && (
                                    <div className="bg-slate-900 text-white p-5 rounded-lg flex items-center gap-4 border border-slate-800 animate-in fade-in zoom-in duration-300">
                                        <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded flex items-center justify-center border border-blue-500/30">
                                            <Lock size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Snapshot Ativo</h3>
                                            <p className="text-xs text-slate-400">Este período está consolidado. Alterações financeiras foram bloqueadas para segurança dos dados.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="col-span-12 lg:col-span-4 h-full">
                                {isSindicoOrAdmin && (
                                    <HabitaCard variant="integrated" className="h-full border border-slate-100" padding="md">
                                        <div className="flex items-center gap-2 mb-3">
                                            <MessageSquare size={14} className="text-emerald-500" />
                                            <HabitaCardTitle className="text-[10px] uppercase font-black">Nota no Boleto</HabitaCardTitle>
                                        </div>
                                        <HabitaTextarea
                                            value={globalMessage}
                                            onChange={(e: any) => setGlobalMessage(e.target.value.substring(0, 250))}
                                            placeholder="Mensagem para todos os PDFs..."
                                            maxLength={250}
                                            className="min-h-[80px] text-xs"
                                        />
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-[9px] text-slate-400 font-bold uppercase">{globalMessage.length}/250</span>
                                            <HabitaButton
                                                onClick={() => handleSaveGlobalMessage()}
                                                disabled={isSavingMessage}
                                                variant="ghost"
                                                size="sm"
                                                isLoading={isSavingMessage}
                                                className="h-7 text-[10px] font-black text-emerald-600 px-2"
                                                icon={<Save size={10} />}
                                            >
                                                SALVAR NOTA
                                            </HabitaButton>
                                        </div>
                                    </HabitaCard>
                                )}
                            </div>
                        </div>

                        {/* 3. Balances & Account Management - Unified Grid */}
                        <div>
                            {/* Desktop Version */}
                            <div className="hidden md:block">
                                <HabitaStatGrid 
                                    title="Saldos & Disponibilidade"
                                    icon={<Banknote />}
                                    metrics={[
                                        {
                                            label: "CAIXA INTERNO",
                                            value: (balances.cash || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                            icon: <Banknote />,
                                            variant: "slate",
                                            subtext: "Dinheiro em Espécie",
                                            action: canManageFinancial ? {
                                                icon: <Settings2 size={14} />,
                                                onClick: () => { setEditCashValue(balances.cash.toString()); setIsEditingCash(true); }
                                            } : undefined
                                        },
                                        {
                                            label: "CONSOLIDADO BANCÁRIO",
                                            value: totalBankBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                            icon: <TrendingUp />,
                                            variant: "indigo",
                                            subtext: `${bankAccounts.length} Contas Ativas`,
                                            action: canManageFinancial ? {
                                                icon: <Settings2 size={14} />,
                                                onClick: () => setIsBankDetailsModalOpen(true)
                                            } : undefined
                                        },
                                        {
                                            label: "FUNDO DE RESERVA",
                                            value: (balances.reserve || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                            icon: <Save />,
                                            variant: "amber",
                                            subtext: "Patrimônio Blindado",
                                            action: canManageFinancial ? {
                                                icon: <Settings2 size={14} />,
                                                onClick: () => { setEditReserveValue((balances.reserve || 0).toString()); setIsEditingReserve(true); }
                                            } : undefined
                                        }
                                    ]}
                                    cols={3}
                                />
                            </div>

                            {/* Mobile Version */}
                            <div className="md:hidden">
                                <HabitaStatGrid3x1 
                                    title="Saldos & Disponibilidade"
                                    icon={<Banknote />}
                                    metrics={[
                                        {
                                            label: "CAIXA INTERNO",
                                            value: (balances.cash || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                            icon: <Banknote />,
                                            variant: "slate",
                                            subtext: "Dinheiro em Espécie",
                                            action: canManageFinancial ? {
                                                icon: <Settings2 size={14} />,
                                                onClick: () => { setEditCashValue(balances.cash.toString()); setIsEditingCash(true); }
                                            } : undefined
                                        },
                                        {
                                            label: "CONSOLIDADO BANCÁRIO",
                                            value: totalBankBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                            icon: <TrendingUp />,
                                            variant: "indigo",
                                            subtext: `${bankAccounts.length} Contas Ativas`,
                                            action: canManageFinancial ? {
                                                icon: <Settings2 size={14} />,
                                                onClick: () => setIsBankDetailsModalOpen(true)
                                            } : undefined
                                        },
                                        {
                                            label: "FUNDO DE RESERVA",
                                            value: (balances.reserve || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                            icon: <Save />,
                                            variant: "amber",
                                            subtext: "Patrimônio Blindado",
                                            action: canManageFinancial ? {
                                                icon: <Settings2 size={14} />,
                                                onClick: () => { setEditReserveValue((balances.reserve || 0).toString()); setIsEditingReserve(true); }
                                            } : undefined
                                        }
                                    ]}
                                />
                            </div>
                        </div>

                        {/* 4. Action Panel - Form for new entries */}
                        {canManageFinancial && !isClosed && (
                            <div ref={formRef}>
                                <HabitaCard variant="white" className="border-indigo-100 bg-indigo-50/20" padding="lg" allowOverflow>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-2">
                                        <HabitaHeading level={3} className="text-indigo-900 mb-0 flex items-center gap-2">
                                            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded">
                                                <Plus size={16} />
                                            </div>
                                            {editingEntryId ? 'Editar Lançamento' : 'Novo Lançamento'}
                                        </HabitaHeading>
                                    </div>
                                    <div className="flex bg-white p-1 rounded-lg border border-indigo-100 shadow-sm">
                                        <button
                                            onClick={() => setEntryType('revenue')}
                                            className={`px-5 py-1.5 text-[10px] font-black transition-all rounded-md uppercase tracking-widest ${entryType === 'revenue' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Receita
                                        </button>
                                        <button
                                            onClick={() => setEntryType('expense')}
                                            className={`px-5 py-1.5 text-[10px] font-black transition-all rounded-md uppercase tracking-widest ${entryType === 'expense' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Despesa
                                        </button>
                                    </div>
                                </div>

                                <form onSubmit={handleAddEntry} className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
                                    <div className="md:col-span-2">
                                        <HabitaInput
                                            label="Descrição"
                                            value={newDesc}
                                            onChange={(e: any) => setNewDesc(e.target.value)}
                                            placeholder="Ex: Pagamento Copel"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <HabitaInput
                                            label="Valor (R$)"
                                            type="number"
                                            step="0.01"
                                            value={newAmount}
                                            onChange={(e: any) => setNewAmount(e.target.value)}
                                            placeholder="0,00"
                                            required
                                            className="font-bold"
                                        />
                                    </div>
                                    <div>
                                        <HabitaCombobox
                                            label={entryType === 'expense' ? 'Origem' : 'Destino'}
                                            value={newAccount}
                                            onChange={(val: any) => setNewAccount(val)}
                                            options={[
                                                ...bankAccounts
                                                    .filter((b: any) => b.status === 'ativa')
                                                    .map((b: any) => ({
                                                        label: `${b.name} - ${b.type === 'corrente' ? 'Corrente' : b.type === 'poupanca' ? 'Poupança' : b.type === 'investimento' ? 'Investimento' : b.type}`,
                                                        sublabel: `Saldo: ${(b.currentBalance || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
                                                        value: b.id,
                                                        group: 'CONTAS BANCÁRIAS'
                                                    })),
                                                { 
                                                    label: 'Caixa Interno', 
                                                    sublabel: `Saldo: ${(balances.cash || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
                                                    value: 'cash', 
                                                    group: 'CAIXA E RESERVA' 
                                                },
                                                { 
                                                    label: 'Fundo de Reserva', 
                                                    sublabel: `Saldo: ${(balances.reserve || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
                                                    value: 'reserve', 
                                                    group: 'CAIXA E RESERVA' 
                                                }
                                            ]}
                                            placeholder="Selecione..."
                                            searchable
                                        />
                                    </div>
                                    <div>
                                        <HabitaCombobox
                                            label="Rubrica"
                                            value={newCategory}
                                            onChange={(val: any) => setNewCategory(val)}
                                            options={(entryType === 'expense' ? expenseCategories : incomeCategories).map((cat: any) => ({
                                                label: cat.name,
                                                value: cat.name
                                            }))}
                                            placeholder="Selecione..."
                                            searchable
                                        />
                                    </div>
                                    <div>
                                        <HabitaDatePicker
                                            label="Data"
                                            value={newDate ? new Date(newDate + 'T12:00:00') : undefined}
                                            onChange={(date) => setNewDate(date.toISOString().split('T')[0])}
                                            containerClassName="w-full"
                                        />
                                    </div>
                                    <div className="flex items-end gap-3 mt-2">
                                        <HabitaFileUpload
                                            variant="button"
                                            label="Recibo"
                                            value={file ? [file] : []}
                                            onFilesSelected={files => setFile(files.length > 0 ? files[0] : null)}
                                            accept="application/pdf,image/*"
                                            isLoading={isUploading}
                                        />
                                        <HabitaButton
                                            type="submit"
                                            disabled={isUploading}
                                            className={`flex-1 h-11 font-black uppercase tracking-widest ${entryType === 'revenue' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'} text-white shadow-xl`}
                                            icon={editingEntryId ? <Check size={18} /> : <Plus size={18} />}
                                        >
                                            {editingEntryId ? 'SALVAR' : 'LANÇAR'}
                                        </HabitaButton>
                                    </div>
                                </form>

                                {editingEntryId && (
                                    <div className="mt-4 flex justify-end">
                                        <button onClick={cancelEditing} className="text-[10px] font-black text-rose-600 hover:underline uppercase tracking-widest transition-colors">Cancelar Edição</button>
                                    </div>
                                )}
                            </HabitaCard>
                        </div>
                        )}

                        {/* 5. Tables Section - Data Visualization */}
                        <div className="grid grid-cols-1 gap-8">
                                {/* Revenues Table Container */}
                            <HabitaCard className="border border-slate-100 shadow-none overflow-hidden" padding="none">
                                <HabitaCardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                                            <HabitaCardTitle className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Entradas (Receitas)</HabitaCardTitle>
                                        </div>
                                        <HabitaBadge variant="success" className="font-black text-[9px]">{allRevenues.length} Lançamentos</HabitaBadge>
                                    </div>
                                </HabitaCardHeader>
                                
                                <HabitaTable responsive mobileVariant="list" containerClassName="border-slate-100/60 shadow-sm overflow-hidden">
                                    <HabitaTHead>
                                        <HabitaTR>
                                            <HabitaTH className="w-24">Data</HabitaTH>
                                            <HabitaTH>Descrição</HabitaTH>
                                            <HabitaTH className="text-right">Valor</HabitaTH>
                                            <HabitaTH className="text-right w-24">Ações</HabitaTH>
                                        </HabitaTR>
                                    </HabitaTHead>
                                    <HabitaTBody>
                                        {allRevenues.length > 0 ? allRevenues.map(revenue => (
                                            <HabitaTR key={revenue.id}>
                                                {/* Mobile Layout */}
                                                <HabitaTD responsive={false} className="md:hidden block w-full py-3 px-4 border-b border-slate-50 last:border-none">
                                                    <div className="flex flex-col gap-2.5 w-full">
                                                        <div className="flex justify-between items-start w-full">
                                                            <div className="flex flex-col flex-1 min-w-0">
                                                                <span className="font-bold text-slate-900 text-sm leading-tight truncate">{revenue.description || 'Sem Descrição'}</span>
                                                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest truncate">{revenue.category || (revenue.isManual ? 'Manual' : 'Taxa Condominial')}</span>
                                                            </div>
                                                            <div className="text-right ml-4 shrink-0">
                                                                <span className="text-sm font-bold text-emerald-600">{revenue.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between w-full">
                                                            <div className="flex items-center gap-2">
                                                                <HabitaBadge variant="neutral" size="xs" className="text-slate-500 font-medium">
                                                                    {revenue.date ? new Date(revenue.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '--/--'}
                                                                </HabitaBadge>
                                                                {revenue.bankTransactionId && (
                                                                    <HabitaBadge variant="success" size="xs" className="uppercase tracking-tighter text-[7px] px-1 py-0">
                                                                        Conciliado
                                                                    </HabitaBadge>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1 ml-auto shrink-0">
                                                                {revenue.receiptUrl && (
                                                                    <HabitaIconActionButton icon={<LinkIcon />} variant="outline" size="sm" tooltip="Ver Comprovante" onClick={() => window.open(revenue.receiptUrl, '_blank')} />
                                                                )}
                                                                {revenue.isManual && canManageFinancial && !isClosed && (
                                                                    <>
                                                                        <HabitaIconActionButton icon={<Pencil />} variant="primary" size="sm" tooltip="Editar" onClick={() => startEditing(revenue, 'revenue')} />
                                                                        <HabitaIconActionButton
                                                                            icon={<Trash2 />}
                                                                            variant="danger"
                                                                            size="sm"
                                                                            onClick={async () => {
                                                                                if (window.confirm('Excluir este lançamento?')) {
                                                                                    try {
                                                                                        await api.delete(`/financial/revenues/${revenue.id}`);
                                                                                        await reloadCondoData();
                                                                                        showToast('Lançamento excluído', 'success');
                                                                                    } catch (err) {
                                                                                        showToast('Erro ao excluir', 'error');
                                                                                    }
                                                                                }
                                                                            }}
                                                                            tooltip="Excluir Lançamento"
                                                                        />
                                                                    </>
                                                                )}
                                                                {!revenue.isManual && (
                                                                    <HabitaBadge variant="neutral" className="text-[7.5px] uppercase py-0 px-2 opacity-50">Sistema</HabitaBadge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </HabitaTD>

                                                {/* Desktop Layout */}
                                                <HabitaTD label="Data" className="hidden md:table-cell">
                                                    <span className="text-slate-500 font-medium text-sm">
                                                        {revenue.date ? new Date(revenue.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '--/--'}
                                                    </span>
                                                </HabitaTD>
                                                <HabitaTD label="Descrição" className="hidden md:table-cell">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-800 font-bold text-sm">{revenue.description || 'Sem Descrição'}</span>
                                                            {revenue.bankTransactionId && (
                                                                <HabitaBadge variant="success" size="xs" className="uppercase tracking-tighter text-[7px] px-1 py-0">
                                                                    <Check size={8} className="mr-0.5" /> Conciliado
                                                                </HabitaBadge>
                                                            )}
                                                            {revenue.receiptUrl && (
                                                                <HabitaIconActionButton icon={<LinkIcon />} variant="outline" size="xs" tooltip="Ver Comprovante" onClick={() => window.open(revenue.receiptUrl, '_blank')} />
                                                            )}
                                                        </div>
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{revenue.category || (revenue.isManual ? 'Manual' : 'Taxa Condominial')}</span>
                                                    </div>
                                                </HabitaTD>
                                                <HabitaTD label="Valor" align="right" className="hidden md:table-cell">
                                                    <span className="font-medium text-emerald-600 text-sm">
                                                        {revenue.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </span>
                                                </HabitaTD>
                                                <HabitaTD label="Ações" align="right" className="hidden md:table-cell">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {revenue.isManual && canManageFinancial && !isClosed ? (
                                                            <>
                                                                <HabitaIconActionButton icon={<Pencil />} variant="primary" size="sm" tooltip="Editar" onClick={() => startEditing(revenue, 'revenue')} />
                                                                <HabitaIconActionButton
                                                                    icon={<Trash2 />}
                                                                    variant="danger"
                                                                    size="sm"
                                                                    onClick={async () => {
                                                                        if (window.confirm('Excluir este lançamento?')) {
                                                                            try {
                                                                                await api.delete(`/financial/revenues/${revenue.id}`);
                                                                                await reloadCondoData();
                                                                                showToast('Lançamento excluído', 'success');
                                                                            } catch (err) {
                                                                                showToast('Erro ao excluir', 'error');
                                                                            }
                                                                        }
                                                                    }}
                                                                    tooltip="Excluir Lançamento"
                                                                />
                                                            </>
                                                        ) : (
                                                            <HabitaBadge variant="neutral" className="text-[7.5px] uppercase py-0 px-2 opacity-50">Sistema</HabitaBadge>
                                                        )}
                                                    </div>
                                                </HabitaTD>
                                            </HabitaTR>
                                        )) : (
                                            <HabitaTR>
                                                <HabitaTD colSpan={4} className="py-12 text-center text-slate-400 text-xs font-black uppercase tracking-widest">Nenhum lançamento encontrado</HabitaTD>
                                            </HabitaTR>
                                        )}
                                    </HabitaTBody>
                                </HabitaTable>

                                {allRevenues.length > 0 && (
                                    <div className="bg-emerald-50/30 border-t border-emerald-100 p-4 flex justify-between items-center px-6">
                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Subtotal Receitas</span>
                                        <span className="text-lg font-bold text-emerald-700">
                                            {totalRevenues.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </div>
                                )}
                            </HabitaCard>

                            {/* Expenses Table Container */}
                            <HabitaCard className="border border-slate-100 shadow-none overflow-hidden" padding="none">
                                <HabitaCardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
                                            <HabitaCardTitle className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Saídas (Despesas)</HabitaCardTitle>
                                        </div>
                                        <HabitaBadge variant="error" className="font-black text-[9px]">{filteredExpenses.length} Lançamentos</HabitaBadge>
                                    </div>
                                </HabitaCardHeader>

                                <HabitaTable responsive mobileVariant="list" containerClassName="border-slate-100/60 shadow-sm overflow-hidden">
                                    <HabitaTHead>
                                        <HabitaTR>
                                            <HabitaTH className="w-24">Data</HabitaTH>
                                            <HabitaTH>Descrição</HabitaTH>
                                            <HabitaTH className="text-right">Valor</HabitaTH>
                                            <HabitaTH className="text-right w-24">Ações</HabitaTH>
                                        </HabitaTR>
                                    </HabitaTHead>
                                    <HabitaTBody>
                                        {filteredExpenses.length > 0 ? filteredExpenses.map((expense: any) => (
                                            <HabitaTR key={expense.id}>
                                                {/* Mobile Layout */}
                                                <HabitaTD responsive={false} className="md:hidden block w-full py-3 px-4 border-b border-slate-50 last:border-none">
                                                    <div className="flex flex-col gap-2.5 w-full">
                                                        <div className="flex justify-between items-start w-full">
                                                            <div className="flex flex-col flex-1 min-w-0">
                                                                <span className="font-bold text-slate-900 text-sm leading-tight truncate">{expense.description || 'Sem Descrição'}</span>
                                                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest truncate">{expense.category || 'Geral'}</span>
                                                            </div>
                                                            <div className="text-right ml-4 shrink-0">
                                                                <span className="text-sm font-bold text-rose-600">{expense.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between w-full">
                                                            <div className="flex items-center gap-2">
                                                                <HabitaBadge variant="neutral" size="xs" className="text-slate-500 font-medium">
                                                                    {expense.date ? new Date(expense.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '--/--'}
                                                                </HabitaBadge>
                                                                {expense.bankTransactionId && (
                                                                    <HabitaBadge variant="success" size="xs" className="uppercase tracking-tighter text-[7px] px-1 py-0">
                                                                        Conciliado
                                                                    </HabitaBadge>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1 ml-auto shrink-0">
                                                                {expense.receiptUrl && (
                                                                    <HabitaIconActionButton icon={<LinkIcon />} variant="outline" size="sm" tooltip="Ver Comprovante" onClick={() => window.open(expense.receiptUrl, '_blank')} />
                                                                )}
                                                                {canManageFinancial && !isClosed && (
                                                                    <>
                                                                        <HabitaIconActionButton icon={<Pencil />} variant="primary" size="sm" tooltip="Editar" onClick={() => startEditing(expense, 'expense')} />
                                                                        <HabitaIconActionButton
                                                                            icon={<Trash2 />}
                                                                            variant="danger"
                                                                            size="sm"
                                                                            onClick={async () => {
                                                                                if (window.confirm('Excluir este lançamento?')) {
                                                                                    try {
                                                                                        await api.delete(`/financial/expenses/${expense.id}`);
                                                                                        await reloadCondoData();
                                                                                        showToast('Lançamento excluído', 'success');
                                                                                    } catch (err) {
                                                                                        showToast('Erro ao excluir', 'error');
                                                                                    }
                                                                                }
                                                                            }}
                                                                            tooltip="Excluir Lançamento"
                                                                        />
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </HabitaTD>

                                                {/* Desktop Layout */}
                                                <HabitaTD label="Data" className="hidden md:table-cell">
                                                    <span className="text-slate-500 font-medium text-sm">
                                                        {expense.date ? new Date(expense.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '--/--'}
                                                    </span>
                                                </HabitaTD>
                                                <HabitaTD label="Descrição" className="hidden md:table-cell">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-800 font-bold text-sm">{expense.description || 'Sem Descrição'}</span>
                                                            {expense.bankTransactionId && (
                                                                <HabitaBadge variant="success" size="xs" className="uppercase tracking-tighter text-[7px] px-1 py-0">
                                                                    <Check size={8} className="mr-0.5" /> Conciliado
                                                                </HabitaBadge>
                                                            )}
                                                            {expense.receiptUrl && (
                                                                <HabitaIconActionButton icon={<LinkIcon />} variant="outline" size="xs" tooltip="Ver Comprovante" onClick={() => window.open(expense.receiptUrl, '_blank')} />
                                                            )}
                                                        </div>
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{expense.category || 'Geral'}</span>
                                                    </div>
                                                </HabitaTD>
                                                <HabitaTD label="Valor" align="right" className="hidden md:table-cell">
                                                    <span className="font-medium text-rose-600 text-sm">
                                                        {expense.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </span>
                                                </HabitaTD>
                                                <HabitaTD label="Ações" align="right" className="hidden md:table-cell">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {canManageFinancial && !isClosed && (
                                                            <>
                                                                <HabitaIconActionButton icon={<Pencil />} variant="primary" size="sm" tooltip="Editar" onClick={() => startEditing(expense, 'expense')} />
                                                                <HabitaIconActionButton
                                                                    icon={<Trash2 />}
                                                                    variant="danger"
                                                                    size="sm"
                                                                    onClick={async () => {
                                                                        if (window.confirm('Excluir este lançamento?')) {
                                                                            try {
                                                                                await api.delete(`/financial/expenses/${expense.id}`);
                                                                                await reloadCondoData();
                                                                                showToast('Lançamento excluído', 'success');
                                                                            } catch (err) {
                                                                                showToast('Erro ao excluir', 'error');
                                                                            }
                                                                        }
                                                                    }}
                                                                    tooltip="Excluir Lançamento"
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                </HabitaTD>
                                            </HabitaTR>
                                        )) : (
                                            <HabitaTR>
                                                <HabitaTD colSpan={4} className="py-12 text-center text-slate-400 text-xs font-black uppercase tracking-widest">Nenhum lançamento encontrado</HabitaTD>
                                            </HabitaTR>
                                        )}
                                    </HabitaTBody>
                                </HabitaTable>

                                {filteredExpenses.length > 0 && (
                                    <div className="bg-rose-50/30 border-t border-rose-100 p-4 flex justify-between items-center px-6">
                                        <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Subtotal Despesas</span>
                                        <span className="text-lg font-bold text-rose-700">
                                            {totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </div>
                                )}
                            </HabitaCard>

                            {/* Final Balance Totalizer Row - Dashboard Style */}
                            <HabitaCard className="bg-slate-900 border-none shadow-xl text-white overflow-hidden relative" padding="none">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                                <div className="relative z-10 p-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
                                    <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-16">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2 opacity-60">Receitas Período</span>
                                            <span className="text-2xl font-bold text-emerald-400 tracking-tight">{totalRevenues.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        </div>
                                        <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 text-slate-500 font-black border border-slate-700/50 shadow-inner"> - </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2 opacity-60">Despesas Período</span>
                                            <span className="text-2xl font-bold text-rose-400 tracking-tight">{totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        </div>
                                    </div>
                                    <div className="md:text-right pt-8 md:pt-0 border-t md:border-t-0 border-slate-800 flex flex-col">
                                        <span className="text-[10px] text-indigo-400 uppercase font-black tracking-[0.2em] mb-2">Resultado Líquido do Mês</span>
                                        <span className={`text-5xl font-bold tracking-tighter ${periodBalance >= 0 ? 'text-white' : 'text-orange-400'}`}>
                                            {periodBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </div>
                                </div>
                            </HabitaCard>
                        </div>
                    </>
                ) : (
                    <ExtraFeesTab canManage={canManageFinancial} />
                )}
                    </div>
                </HabitaContainerContent>
            </HabitaContainer>
                    {/* Modals for adjusting balances */}
                    <HabitaModal
                        isOpen={isEditingCash}
                        onClose={() => setIsEditingCash(false)}
                        title="Ajustar Saldo em Caixa"
                    >
                        <div className="space-y-4">
                            <HabitaInput
                                label="Novo Valor (R$)"
                                type="number"
                                step="0.01"
                                value={editCashValue}
                                onChange={(e: any) => setEditCashValue(e.target.value)}
                                className="font-bold"
                            />
                            <div className="flex gap-3 mt-6">
                                <HabitaButton onClick={() => setIsEditingCash(false)} variant="outline" className="flex-1">
                                    CANCELAR
                                </HabitaButton>
                                <HabitaButton
                                    onClick={async () => {
                                        try {
                                            await api.put('/financial/balances', { cash: parseFloat(editCashValue) });
                                            await reloadCondoData();
                                            setIsEditingCash(false);
                                            showToast('Saldo em caixa atualizado', 'success');
                                        } catch (err) {
                                            showToast('Erro ao atualizar saldo em caixa', 'error');
                                        }
                                    }}
                                    variant="primary"
                                    className="flex-1"
                                >
                                    SALVAR
                                </HabitaButton>
                            </div>
                        </div>
                    </HabitaModal>

                    <HabitaModal
                        isOpen={isEditingBank}
                        onClose={() => setIsEditingBank(false)}
                        title="Ajustar Saldo em Banco"
                    >
                        <div className="space-y-4">
                            <HabitaInput
                                label="Novo Valor (R$)"
                                type="number"
                                step="0.01"
                                value={editBankValue}
                                onChange={(e: any) => setEditBankValue(e.target.value)}
                                className="font-bold"
                            />
                            <div className="flex gap-3 mt-6">
                                <HabitaButton onClick={() => setIsEditingBank(false)} variant="outline" className="flex-1">
                                    CANCELAR
                                </HabitaButton>
                                <HabitaButton
                                    onClick={() => {
                                        // This modal is now deprecated for individual bank accounts,
                                        // but keeping the logic for a single 'bank' balance if it still exists.
                                        // For multi-bank, the bank details modal would be used to adjust individual accounts.
                                        // updateBalances({ ...balances, bank: val }); // Original call, now commented out as per instruction context
                                        setIsEditingBank(false);
                                        showToast('Ajuste de saldo bancário individual não suportado aqui. Use o detalhamento de contas.', 'info');
                                    }}
                                    variant="primary"
                                    className="flex-1"
                                >
                                    SALVAR
                                </HabitaButton>
                            </div>
                        </div>
                    </HabitaModal>

                    <HabitaModal
                        isOpen={isEditingReserve}
                        onClose={() => setIsEditingReserve(false)}
                        title="Ajustar Fundo de Reserva"
                    >
                        <div className="space-y-4">
                            <HabitaInput
                                label="Novo Valor (R$)"
                                type="number"
                                step="0.01"
                                value={editReserveValue}
                                onChange={(e: any) => setEditReserveValue(e.target.value)}
                                className="font-bold"
                            />
                            <div className="flex gap-3 mt-6">
                                <HabitaButton onClick={() => setIsEditingReserve(false)} variant="outline" className="flex-1">
                                    CANCELAR
                                </HabitaButton>
                                <HabitaButton
                                    onClick={async () => {
                                        try {
                                            await api.put('/financial/balances', { reserve: parseFloat(editReserveValue) });
                                            await reloadCondoData();
                                            setIsEditingReserve(false);
                                            showToast('Fundo de reserva atualizado', 'success');
                                        } catch (err) {
                                            showToast('Erro ao atualizar fundo de reserva', 'error');
                                        }
                                    }}
                                    variant="primary"
                                    className="flex-1"
                                >
                                    SALVAR
                                </HabitaButton>
                            </div>
                        </div>
                    </HabitaModal>
            {/* Modal de Detalhamento de Contas Bancárias */}
            <HabitaModal
                isOpen={isBankDetailsModalOpen}
                onClose={() => { setIsBankDetailsModalOpen(false); setEditingBankId(null); setEditBankBalanceValue(''); }} // Reset editing state on close
                title="Detalhamento de Contas"
            >
                <div className="space-y-4">
                    <p className="text-xs font-medium text-slate-500 mb-2">Visão consolidada de todas as contas bancárias ativas.</p>
                    <div className="grid grid-cols-1 gap-3">
                        {bankAccounts.filter((b: any) => b.status === 'ativa').map((bank: any) => (
                            <div key={bank.id} className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center justify-between group hover:bg-white hover:border-indigo-100 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                                        <Banknote size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{bank.name}</h4>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                            {bank.type === 'corrente' ? 'Conta Corrente' : bank.type === 'poupanca' ? 'Conta Poupança' : 'Investimento'}
                                        </p>
                                    </div>
                                </div>
                                
                                {editingBankId === bank.id ? (
                                    <div className="flex items-center gap-2">
                                        <HabitaInput
                                            type="number"
                                            step="0.01"
                                            value={editBankBalanceValue}
                                            onChange={(e: any) => setEditBankBalanceValue(e.target.value)}
                                            className="w-28 font-bold h-8 text-xs"
                                        />
                                        <div className="flex gap-1">
                                            <HabitaIconActionButton 
                                                icon={<Check size={14} />} 
                                                variant="primary" 
                                                size="sm" 
                                                tooltip="Salvar"
                                                onClick={() => handleSaveBankBalance(bank.id)}
                                            />
                                            <HabitaIconActionButton 
                                                icon={<X size={14} />} 
                                                variant="danger" 
                                                size="sm" 
                                                tooltip="Cancelar"
                                                onClick={() => { setEditingBankId(null); setEditBankBalanceValue(''); }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-sm font-black text-slate-900 tracking-tight">
                                                {bank.currentBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </p>
                                        </div>
                                        {canManageFinancial && (
                                            <button 
                                                onClick={() => { 
                                                    setEditBankBalanceValue(bank.currentBalance.toString()); 
                                                    setEditingBankId(bank.id); 
                                                }} 
                                                className="w-7 h-7 rounded bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                                            >
                                                <Pencil size={12} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </HabitaModal>

            {/* Modal de Aviso de Saldo Insuficiente */}
            <HabitaModal
                isOpen={isBalanceWarningOpen}
                onClose={() => setIsBalanceWarningOpen(false)}
                title="Aviso de Saldo Insuficiente"
                size="sm"
            >
                <div className="space-y-6 text-center py-4">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-xl shadow-amber-500/10">
                        <AlertTriangle size={40} className="text-amber-500" />
                    </div>
                    
                    <div className="space-y-2">
                        <p className="text-slate-600 font-medium leading-relaxed">
                            O valor da despesa <strong className="text-slate-900">({parseFloat(newAmount || '0').toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</strong> é maior que o saldo atual na origem selecionada.
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
                            O lançamento será realizado para não travar a operação, porém o saldo ficará negativo até ser compensado.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <HabitaButton 
                            variant="outline" 
                            onClick={() => setIsBalanceWarningOpen(false)} 
                            className="flex-1"
                        >
                            CANCELAR
                        </HabitaButton>
                        <HabitaButton 
                            variant="primary" 
                            onClick={() => handleAddEntry(undefined)} 
                            className="flex-1 bg-amber-600 border-amber-600 hover:bg-amber-700 shadow-amber-500/20"
                        >
                            CONFIRMAR
                        </HabitaButton>
                    </div>
                </div>
            </HabitaModal>
        </div>
    );
}
