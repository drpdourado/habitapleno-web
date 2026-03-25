import { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Line, LineChart, PieChart, Pie, Cell
} from 'recharts';
import api from '../services/api';
import {
    FileDown, TrendingUp, TrendingDown,
    DollarSign, Zap, AlertTriangle,
    PieChart as PieChartIcon,
    BarChart as BarChartIcon,
    AlertCircle, CheckCircle2, Clock, Tag,
    Filter, Wrench, Scale, Lock,
} from 'lucide-react';
// jsPDF and autoTable removed - PDF generation migrated to Backend API


// UnitSnapshot remains local as it might have specific needs for history snapshots
export interface UnitSnapshot {
    id: string;
    typeId: string;
    ownerName: string;
    status: string;
    currentGasReading?: number;
    lastGasReading?: number;
    amountPaid?: number;
    paymentDate?: string;
}

interface ConsumoAuditItem {
    id: string;
    consumption: number;
    prevConsumption: number;
    variation: number;
    isAlert: boolean;
}

interface InadimplenciaRankItem {
    unit: string;
    owner: string;
    totalAmount: number;
    months: number;
    status?: string;
}

interface FinancialCategoryItem {
    name: string;
    amount: number;
    percent: number;
}

// Utils
import { generateFinancialReport, generateGasReport, generateDelinquencyReport, generateOcorrenciasReport } from '../utils/PDFReportUtils';

// Habita Design System
import { HabitaCard, HabitaCardHeader, HabitaCardTitle } from '../components/ui/HabitaCard';
import { HabitaHeading } from '../components/ui/HabitaHeading';
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaStatGrid } from '../components/ui/HabitaStatGrid';
import { HabitaStatGrid3x1 } from '../components/ui/HabitaStatGrid3x1';
import { HabitaTabs } from '../components/ui/HabitaTabs';
import { HabitaMobileTabs } from '../components/ui/HabitaMobileTabs';
import { HabitaTable, HabitaTHead, HabitaTBody, HabitaTR, HabitaTH, HabitaTD } from '../components/ui/HabitaTable';
import { HabitaMonthPicker } from '../components/ui/HabitaMonthPicker';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { HabitaSpinner } from '../components/ui/HabitaSpinner';

import { HabitaCombobox } from '../components/ui/HabitaCombobox';
import { useApp } from '../contexts';
import type { Ocorrencia, HistoryRecord } from '../contexts';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const ReportsPage = () => {
    const {
        settings,
        history: contextHistory,
        closures: contextClosures,
        revenues: contextRevenues,
        categories: contextCategories,
        balances
    } = useApp();

    const [activeTab, setActiveTab] = useState<'financeiro' | 'consumo' | 'operacional'>('financeiro');

    // Filter State
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');


    const [isFetching, setIsFetching] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

    // Filtered Local State for display
    const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);

    const [inadimplenciaStats, setInadimplenciaStats] = useState<{
        chartData: any[];
        ranking: any[];
        kpis: {
            totalDebt: number;
            uniqueUnits: number;
            rate: number;
        }
    }>({
        chartData: [],
        ranking: [],
        kpis: {
            totalDebt: 0,
            uniqueUnits: 0,
            rate: 0
        }
    });

    const [fluxoDeCaixaStats, setFluxoDeCaixaStats] = useState<{
        stackedChartData: any[];
        pieData: any[];
        dreList: any[];
        incomeCategories: any[];
        expenseCategories: any[];
        kpis: {
            totalIn: number;
            totalOut: number;
            balance: number;
        }
    }>({
        stackedChartData: [],
        pieData: [],
        dreList: [],
        incomeCategories: [],
        expenseCategories: [],
        kpis: {
            totalIn: 0,
            totalOut: 0,
            balance: 0
        }
    });

    const [apiStats, setApiStats] = useState<any>(null);

    // Initial setup and dynamic years fetching from context
    useEffect(() => {
        if (contextHistory.length === 0 && contextClosures.length === 0) return;



        // Set defaults if empty
        if (!startDate || !endDate) {
            const today = new Date();
            const past = new Date();
            past.setMonth(today.getMonth() - 5);
            setStartDate(`${past.getFullYear()}-${(past.getMonth() + 1).toString().padStart(2, '0')}`);
            setEndDate(`${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`);
        }
    }, [contextHistory, contextClosures]);

    // Perform Local Filter (Replacing Fetch)
    const fetchReports = async () => {
        if (!startDate || !endDate) return;
        setIsFetching(true);

        try {
            // Wait a tiny bit for UX feel
            await new Promise(r => setTimeout(r, 400));

            // Backend Unified Fetch: Stats
            const res = await api.get(`/financial/reports/stats?startDate=${startDate}&endDate=${endDate}&selectedCategoryId=${selectedCategoryId}`);

            if (res.data.success) {
                setInadimplenciaStats(res.data.data.delinquency);
                setFluxoDeCaixaStats(res.data.data.financial);
                setHistoryData(res.data.data.rawHistory || []);
                setApiStats(res.data.data);
            }

        } catch (error) {
            console.error("Error filtering report data:", error);
        } finally {
            setIsFetching(false);
        }
    };

    // Re-fetch when specific filters change
    useEffect(() => {
        fetchReports();
    }, [startDate, endDate, selectedCategoryId]);

    // Only run initial fetch once context data is available and dates are set
    useEffect(() => {
        if (startDate && endDate && settings.condoName && (contextHistory.length > 0 || contextRevenues.length > 0)) {
            fetchReports();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings.condoName, startDate, endDate, contextHistory.length, contextRevenues.length]);
    // ^ Trigger fetch after years are loaded or on condo change


    // ==========================================
    // DATA PREP: 3. Consumo (Gas)
    // ==========================================
    const consumoStats = useMemo(() => {
        if (apiStats?.consumption) return apiStats.consumption;

        // Fallback local se a API ainda não carregou (opcional, mas bom para UX)
        return {
            chartData: [],
            auditTable: [],
            kpis: {
                latestTotal: 0,
                avgPerUnit: 0,
                gasPrice: settings.gasPrice || 0
            }
        };
    }, [apiStats, settings.gasPrice]);

    // ==========================================
    // DATA PREP: 4. Operacional (Ocorrências)
    // ==========================================
    const ocorrenciasStats = useMemo(() => {
        if (apiStats?.operational) {
            const { statusCounts, categoryBreakdown } = apiStats.operational;
            return {
                total: statusCounts.Total,
                resolvedCount: statusCounts.Resolvida,
                pendingCount: statusCounts.Aberta,
                resolutionRate: statusCounts.resolutionRate,
                sla: statusCounts.sla,
                criticalList: statusCounts.criticalList || [],
                statusData: [
                    { name: 'Pendentes', value: statusCounts.Aberta, color: '#f59e0b' },
                    { name: 'Resolvidas', value: statusCounts.Resolvida, color: '#10b981' }
                ],
                categoryData: Object.entries(categoryBreakdown || {}).map(([name, value]) => ({ name, value: value as number }))
            };
        }
        return {
            total: 0,
            resolvedCount: 0,
            pendingCount: 0,
            resolutionRate: 0,
            sla: "0",
            criticalList: [],
            statusData: [],
            categoryData: []
        };
    }, [apiStats]);

    // Ocorrências e Consumo agora são processados no backend via apiStats



    // ==========================================
    // UI HANDLERS
    // ==========================================
    const exportPDF = async (type: 'inadimplencia' | 'caixa' | 'consumo' | 'operacional') => {
        if (type === 'caixa') {
            const [sY, sM] = startDate.split('-');
            const [eY, eM] = endDate.split('-');
            const referenceStr = `${sM}/${sY} a ${eM}/${eY}`;
            
            await generateFinancialReport({
                referenceMonth: referenceStr,
                includeReceipts: true
            });
        } else if (type === 'consumo') {
            if (historyData.length > 0) {
                const latest = historyData[historyData.length - 1];
                await generateGasReport(latest.referenceMonth);
            }
        } else if (type === 'inadimplencia') {
            await generateDelinquencyReport();
        } else if (type === 'operacional') {
            await generateOcorrenciasReport();
        }
    };

    const categoryOptions = useMemo(() => {
        const options = (contextCategories || []).map((c: any) => ({ value: c.id, label: c.name }));
        options.unshift({ value: 'all', label: 'Todas as Categorias' });
        
        // Add virtual Taxa Condominial if not explicitly there
        if (!options.find(o => o.value === 'TAXA_CONDOMINIAL')) {
            options.push({ value: 'TAXA_CONDOMINIAL', label: 'Taxas Condominiais' });
        }
        return options;
    }, [contextCategories]);



    return (
        <div className="w-full space-y-8 animate-in fade-in duration-700 pb-12">
            <HabitaCard padding="none" className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm p-4 md:p-8">
                {/* Header Integrado */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-100 pb-8">
                    <div>
                        <HabitaHeading level={1} className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200/50">
                                <BarChartIcon className="text-white" size={24} />
                            </div>
                            Relatórios Gerenciais
                        </HabitaHeading>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-3">
                            Painel de Inteligência e Consolidado de Dados
                        </p>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        <HabitaTabs
                            tabs={[
                                { id: 'financeiro', label: 'Financeiro', icon: <DollarSign size={14} /> },
                                { id: 'consumo', label: 'Consumo', icon: <Zap size={14} /> },
                                { id: 'operacional', label: 'Operacional', icon: <Wrench size={14} /> }
                            ]}
                            activeTab={activeTab}
                            onChange={(id) => setActiveTab(id as any)}
                            className="border-none bg-transparent p-0 hidden md:flex"
                        />
                        <HabitaMobileTabs
                            tabs={[
                                { id: 'financeiro', label: 'Financeiro', icon: <DollarSign size={14} /> },
                                { id: 'consumo', label: 'Consumo', icon: <Zap size={14} /> },
                                { id: 'operacional', label: 'Operacional', icon: <Wrench size={14} /> }
                            ]}
                            activeTab={activeTab}
                            onChange={(id) => setActiveTab(id as any)}
                            className="md:hidden"
                            label="Escolher Relatório"
                        />
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-end gap-6 mb-10 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 border-dashed">
                    <div className="flex-1 min-w-[200px]">
                        <HabitaMonthPicker
                            label="Período Inicial"
                            value={startDate}
                            onChange={setStartDate}
                        />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <HabitaMonthPicker
                            label="Período Final"
                            value={endDate}
                            onChange={setEndDate}
                        />
                    </div>
                    <HabitaButton
                        onClick={fetchReports}
                        isLoading={isFetching}
                        variant="primary"
                        className="h-12 px-10 rounded-xl font-black shadow-lg shadow-indigo-100"
                        icon={<Filter size={18} />}
                    >
                        Filtrar Dados
                    </HabitaButton>
                </div>

                {isFetching ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-6">
                        <HabitaSpinner size="xl" variant="primary" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processando Inteligência de Dados...</span>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* TAB: FINANCEIRO */}
                        {activeTab === 'financeiro' && (
                            <div className="space-y-10">
                                {/* Inadimplência Section */}
                                <HabitaCard padding="none" className="border-indigo-100 shadow-indigo-50/30 overflow-hidden">
                                    <div className="bg-slate-50/80 px-4 md:px-8 py-4 md:py-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 shadow-sm">
                                                <AlertTriangle size={24} />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Análise de Recebíveis e Inadimplência</h2>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Status de pagamentos e ranking de devedores</p>
                                            </div>
                                        </div>
                                        <HabitaButton
                                            onClick={() => exportPDF('inadimplencia')}
                                            variant="outline"
                                            size="sm"
                                            icon={<FileDown size={14} />}
                                            className="font-black"
                                        >
                                            Exportar PDF
                                        </HabitaButton>
                                    </div>

                                    <div className="p-4 md:p-6 flex flex-col gap-6 md:gap-8">
                                        {/* KPIs */}
                                        <div className="hidden md:block">
                                            <HabitaStatGrid 
                                                title="Indicadores de Inadimplência"
                                                icon={<AlertTriangle className="text-rose-500" />}
                                                metrics={[
                                                    {
                                                        label: "TOTAL DEVIDO",
                                                        value: (inadimplenciaStats.kpis?.totalDebt ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                                        icon: <DollarSign />,
                                                        variant: "rose",
                                                        subtext: "Débito Acumulado"
                                                    },
                                                    {
                                                        label: "UNIDADES DEVEDORAS",
                                                        value: (inadimplenciaStats.kpis?.uniqueUnits ?? 0).toString(),
                                                        icon: <Tag />,
                                                        variant: "slate",
                                                        subtext: "Devedores Atuais"
                                                    },
                                                    {
                                                        label: "% INADIMPLÊNCIA",
                                                        value: `${(inadimplenciaStats.kpis?.rate ?? 0).toFixed(1)}%`,
                                                        icon: <PieChartIcon />,
                                                        variant: "amber",
                                                        subtext: "Variação do Rateio"
                                                    }
                                                ]}
                                                cols={3}
                                            />
                                        </div>

                                        <div className="md:hidden">
                                            <HabitaStatGrid3x1 
                                                title="Indicadores de Inadimplência"
                                                icon={<AlertTriangle className="text-rose-500" />}
                                                metrics={[
                                                    {
                                                        label: "TOTAL DEVIDO",
                                                        value: (inadimplenciaStats.kpis?.totalDebt ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                                        icon: <DollarSign />,
                                                        variant: "rose",
                                                        subtext: "Débito Acumulado"
                                                    },
                                                    {
                                                        label: "UNIDADES DEVEDORAS",
                                                        value: (inadimplenciaStats.kpis?.uniqueUnits ?? 0).toString(),
                                                        icon: <Tag />,
                                                        variant: "slate",
                                                        subtext: "Devedores Atuais"
                                                    },
                                                    {
                                                        label: "% INADIMPLÊNCIA",
                                                        value: `${(inadimplenciaStats.kpis?.rate ?? 0).toFixed(1)}%`,
                                                        icon: <PieChartIcon />,
                                                        variant: "amber",
                                                        subtext: "Variação do Rateio"
                                                    }
                                                ]}
                                            />
                                        </div>

                                        <div className="flex flex-col xl:flex-row gap-8">
                                            {/* Chart */}
                                            <div className="flex-1 min-w-0 border border-slate-100 rounded-2xl p-6 bg-slate-50/30">
                                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Evolução da Inadimplência por Mês</h3>
                                                <div className="h-[300px] w-full relative">
                                                    {inadimplenciaStats.chartData.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height={300} minWidth={0}>
                                                            <BarChart data={inadimplenciaStats.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                                <XAxis dataKey="name" fontSize={10} fontWeight="800" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                                                <YAxis fontSize={10} fontWeight="800" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1' }} tickFormatter={(val) => `R$${(val / 1000).toFixed(1)}k`} />
                                                                <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: any) => [Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Dívida']} />
                                                                <Bar dataKey="total" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={28} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    ) : (
                                                        <div className="h-full flex items-center justify-center text-slate-400">
                                                            <span className="text-xs font-bold uppercase tracking-widest">Nenhuma inadimplência registrada</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Ranking */}
                                            <div className="xl:w-96 flex flex-col border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                                                <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 font-bold text-[10px] uppercase text-slate-500 tracking-widest">Top 5 Devedores</div>
                                                <div className="divide-y divide-slate-50 overflow-y-auto max-h-[350px]">
                                                    {(inadimplenciaStats.ranking || []).map((rank: InadimplenciaRankItem) => (
                                                        <div key={rank.unit} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs">
                                                                    {rank.unit}
                                                                </div>
                                                                <div>
                                                                    <span className="font-bold text-sm text-slate-700 block">Unidade {rank.unit}</span>
                                                                    <p className="text-[10px] text-slate-400 truncate max-w-[140px] font-medium">{rank.owner}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="font-black text-sm text-rose-600 block">{(rank.totalAmount ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{rank.months} meses • {rank.status}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {(inadimplenciaStats.ranking || []).length === 0 && <div className="p-8 text-center text-xs text-slate-400 uppercase font-bold tracking-widest opacity-50">Nenhum registro encontrado</div>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </HabitaCard>

                                {/* Fluxo de Caixa / Balanço Section */}
                                <HabitaCard padding="none" className="border-slate-200 shadow-sm overflow-hidden">
                                    <HabitaCardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 p-4 md:p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                                                <TrendingUp size={20} />
                                            </div>
                                            <div>
                                                <HabitaCardTitle className="text-base text-slate-900 border-none p-0 tracking-tight">Balanço Financeiro Consolidado</HabitaCardTitle>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Apuração real de caixa (Entradas vs Saídas)</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col sm:flex-row items-center gap-3">
                                            <div className="w-full sm:w-64">
                                                <HabitaCombobox
                                                    options={categoryOptions}
                                                    value={selectedCategoryId}
                                                    onChange={setSelectedCategoryId}
                                                    placeholder="Filtrar por Categoria"
                                                    className="w-full"
                                                />
                                            </div>
                                            <HabitaButton
                                                onClick={() => exportPDF('caixa')}
                                                variant="primary"
                                                size="sm"
                                                icon={<FileDown size={14} />}
                                                className="w-full sm:w-auto"
                                            >
                                                Exportar DRE (PDF)
                                            </HabitaButton>
                                        </div>
                                    </HabitaCardHeader>

                                    {/* Consolidated Financial KPIs Grid */}
                                    <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/20">
                                        <HabitaStatGrid 
                                            title="Resumo do Fluxo de Caixa"
                                            icon={<TrendingUp className="text-emerald-500" />}
                                            metrics={[
                                                {
                                                    label: "TOTAL RECEBIDO",
                                                    value: (fluxoDeCaixaStats.kpis?.totalIn ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                                    icon: <TrendingUp />,
                                                    variant: "emerald",
                                                    subtext: "Entradas do Período"
                                                },
                                                {
                                                    label: "TOTAL PAGO",
                                                    value: (fluxoDeCaixaStats.kpis?.totalOut ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                                    icon: <TrendingDown />,
                                                    variant: "rose",
                                                    subtext: "Saídas do Período"
                                                },
                                                {
                                                    label: "RESULTADO LÍQUIDO",
                                                    value: (fluxoDeCaixaStats.kpis?.balance ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                                    icon: <Scale />,
                                                    variant: (fluxoDeCaixaStats.kpis?.balance ?? 0) >= 0 ? "emerald" : "rose",
                                                    subtext: (fluxoDeCaixaStats.kpis?.balance ?? 0) >= 0 ? "Superávit" : "Déficit"
                                                },
                                                {
                                                    label: "FUNDO DE RESERVA",
                                                    value: (balances?.reserve || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                                    icon: <Lock />,
                                                    variant: "amber",
                                                    subtext: "Patrimônio Blindado"
                                                }
                                            ]}
                                            cols={4}
                                        />
                                    </div>

                                    {/* Gráficos e DRE */}
                                    <div className="p-4 md:p-6 w-full grid grid-cols-1 xl:grid-cols-2 gap-8">
                                        {/* Gráficos de Coluna Esquerda */}
                                        <div className="flex flex-col gap-8">
                                            {/* Barras Empilhadas */}
                                            <div className="flex flex-col bg-slate-50/30 rounded-2xl p-4 md:p-6 border border-slate-100 min-w-0">
                                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Fluxo Histórico (Entradas vs Saídas)</h3>
                                                <div className="h-[280px] w-full relative">
                                                    { (fluxoDeCaixaStats.stackedChartData || []).length > 0 ? (
                                                        <ResponsiveContainer width="100%" height={280} minWidth={0}>
                                                            <BarChart data={fluxoDeCaixaStats.stackedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                                <XAxis dataKey="name" fontSize={10} fontWeight="800" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} minTickGap={15} />
                                                                <YAxis fontSize={9} fontWeight="800" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1' }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                                                                <Tooltip formatter={(val: any, name: any) => [Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), name]} />
                                                                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                                                                <Bar dataKey="Entradas" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} maxBarSize={32} />
                                                                <Bar dataKey="Saídas" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    ) : <div className="h-full flex items-center justify-center text-[10px] font-bold uppercase text-slate-300">Sem dados consolidáveis</div>}
                                                </div>
                                            </div>

                                            {/* Gráfico Pizza de Categorias de Despesa */}
                                            <div className="flex flex-col bg-slate-50/30 rounded-2xl p-4 md:p-6 border border-slate-100 min-w-0">
                                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Distribuição de Saídas por Categoria</h3>
                                                <div className="h-[400px] md:h-[280px] w-full relative">
                                                    { (fluxoDeCaixaStats.pieData || []).length > 0 ? (
                                                        <ResponsiveContainer width="100%" height={280} minWidth={0}>
                                                            <PieChart>
                                                                <Pie
                                                                    data={fluxoDeCaixaStats.pieData}
                                                                    cx="50%"
                                                                    cy="40%"
                                                                    innerRadius={60}
                                                                    outerRadius={85}
                                                                    paddingAngle={4}
                                                                    dataKey="value"
                                                                    stroke="none"
                                                                >
                                                                    { (fluxoDeCaixaStats.pieData || []).map((entry, index) => (
                                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                                    ))}
                                                                </Pie>
                                                                <Tooltip formatter={(val: any) => [Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Gasto Total']} />
                                                                <Legend verticalAlign="bottom" align="center" layout="horizontal" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px', maxHeight: '120px', overflowY: 'auto' }} />
                                                            </PieChart>
                                                        </ResponsiveContainer>
                                                    ) : <div className="h-full flex items-center justify-center text-[10px] font-bold uppercase text-slate-300">Sem categorias registradas</div>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* DRE Column Right */}
                                        <div className="flex flex-col border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                                            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Demonstrativo Detalhado (DRE)</span>
                                                <HabitaBadge variant="indigo" size="sm">Consolidado</HabitaBadge>
                                            </div>
                                            <div className="flex-1 overflow-y-auto min-h-[500px]">
                                                <HabitaTable mobileVariant="list"
                                                    responsive
                                                    className="border-none"
                                                    containerClassName="border-none rounded-none"
                                                >
                                                    <HabitaTHead>
                                                        <HabitaTR>
                                                            <HabitaTH>Categoria</HabitaTH>
                                                            <HabitaTH align="right">Valor</HabitaTH>
                                                            <HabitaTH align="right">% do Total</HabitaTH>
                                                        </HabitaTR>
                                                    </HabitaTHead>
                                                    <HabitaTBody>
                                                        {/* SECTION: RECEITAS */}
                                                        <HabitaTR className="bg-emerald-50/20">
                                                            <HabitaTD colSpan={3} className="py-2.5 px-6">
                                                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                                                                    Receitas Operacionais
                                                                </span>
                                                            </HabitaTD>
                                                        </HabitaTR>
                                                        { (fluxoDeCaixaStats.incomeCategories || []).map((item: FinancialCategoryItem, idx: number) => (
                                                            <HabitaTR key={`in-${idx}`}>
                                                                <HabitaTD className="py-3 px-8">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-slate-700 text-sm">{item.name}</span>
                                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Entrada Identificada</span>
                                                                    </div>
                                                                </HabitaTD>
                                                                <HabitaTD align="right" className="font-black text-emerald-600 text-sm">
                                                                    {(item.amount ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                </HabitaTD>
                                                                <HabitaTD align="right">
                                                                    <div className="flex items-center justify-end gap-3">
                                                                        <span className="text-xs font-bold text-slate-400">{(item.percent ?? 0).toFixed(1)}%</span>
                                                                        <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                                                            <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${Math.min(item.percent ?? 0, 100)}%` }} />
                                                                        </div>
                                                                    </div>
                                                                </HabitaTD>
                                                            </HabitaTR>
                                                        ))}
                                                        <HabitaTR className="bg-emerald-50/40 border-t border-emerald-100/50">
                                                            <HabitaTD className="py-2.5 px-8 font-black text-emerald-700 text-[10px] uppercase tracking-wider">Subtotal de Receitas</HabitaTD>
                                                            <HabitaTD align="right" className="font-black text-emerald-700 text-sm">{ (fluxoDeCaixaStats.kpis?.totalIn ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</HabitaTD>
                                                            <HabitaTD align="right" className="font-black text-emerald-700 text-[10px] pr-8">100%</HabitaTD>
                                                        </HabitaTR>

                                                        {/* SECTION: DESPESAS */}
                                                        <HabitaTR className="bg-rose-50/20 mt-4">
                                                            <HabitaTD colSpan={3} className="py-2.5 px-6">
                                                                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-none flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-200" />
                                                                    Despesas Operacionais
                                                                </span>
                                                            </HabitaTD>
                                                        </HabitaTR>
                                                        { (fluxoDeCaixaStats.expenseCategories || []).map((item: FinancialCategoryItem, idx: number) => (
                                                            <HabitaTR key={`out-${idx}`}>
                                                                <HabitaTD className="py-3 px-8">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-slate-700 text-sm">{item.name}</span>
                                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Saída Registrada</span>
                                                                    </div>
                                                                </HabitaTD>
                                                                <HabitaTD align="right" className="font-black text-rose-500 text-sm">
                                                                    {(item.amount ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                </HabitaTD>
                                                                <HabitaTD align="right">
                                                                    <div className="flex items-center justify-end gap-3">
                                                                        <span className="text-xs font-bold text-slate-400">{(item.percent ?? 0).toFixed(1)}%</span>
                                                                        <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                                                            <div className="h-full bg-rose-400 transition-all duration-1000" style={{ width: `${Math.min(item.percent ?? 0, 100)}%` }} />
                                                                        </div>
                                                                    </div>
                                                                </HabitaTD>
                                                            </HabitaTR>
                                                        ))}
                                                        <HabitaTR className="bg-rose-50/40 border-t border-rose-100/50">
                                                            <HabitaTD className="py-2.5 px-8 font-black text-rose-700 text-[10px] uppercase tracking-wider">Subtotal de Despesas</HabitaTD>
                                                            <HabitaTD align="right" className="font-black text-rose-700 text-sm">{ (fluxoDeCaixaStats.kpis?.totalOut ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</HabitaTD>
                                                            <HabitaTD align="right" className="font-black text-rose-700 text-[10px] pr-8">100%</HabitaTD>
                                                        </HabitaTR>

                                                        {/* TOTAL NET RESULT */}
                                                        <HabitaTR className="bg-slate-900 text-white">
                                                            <HabitaTD className="py-5 px-8 font-black uppercase tracking-[0.2em] text-[11px]">Resultado Consolidado</HabitaTD>
                                                            <HabitaTD align="right" className="font-black text-lg">{ (fluxoDeCaixaStats.kpis?.balance ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</HabitaTD>
                                                            <HabitaTD align="right">
                                                                <div className={cn(
                                                                    "inline-flex items-center px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest",
                                                                    (fluxoDeCaixaStats.kpis?.balance ?? 0) >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                                                                )}>
                                                                    { (fluxoDeCaixaStats.kpis?.balance ?? 0) >= 0 ? 'Superávit' : 'Déficit'}
                                                                </div>
                                                            </HabitaTD>
                                                        </HabitaTR>

                                                    </HabitaTBody>
                                                </HabitaTable>
                                            </div>
                                        </div>
                                    </div>
                                </HabitaCard>
                            </div>
                        )}


                        {/* TAB: CONSUMO */}
                        {activeTab === 'consumo' && (
                            <div className="space-y-8">
                                <div className="hidden md:block">
                                    <HabitaStatGrid 
                                        title="Indicadores de Consumo"
                                        icon={<Zap className="text-blue-500" />}
                                        metrics={[
                                            {
                                                label: "VOLUME TOTAL",
                                                value: `${(consumoStats.kpis?.latestTotal ?? 0).toFixed(2)} m³`,
                                                icon: <TrendingUp />,
                                                variant: "indigo",
                                                subtext: "Última Apuração"
                                            },
                                            {
                                                label: "MÉDIA POR UNIDADE",
                                                value: `${(consumoStats.kpis?.avgPerUnit ?? 0).toFixed(2)} m³`,
                                                icon: <PieChartIcon />,
                                                variant: "slate",
                                                subtext: "Rateio Médio"
                                            },
                                            {
                                                label: "CUSTO MÉDIO",
                                                value: (consumoStats.kpis.totalValue ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                                icon: <DollarSign />,
                                                variant: "amber",
                                                subtext: "Projeção Total"
                                            }
                                        ]}
                                        cols={3}
                                    />
                                </div>

                                <div className="md:hidden">
                                    <HabitaStatGrid3x1 
                                        title="Indicadores de Consumo"
                                        icon={<Zap className="text-blue-500" />}
                                        metrics={[
                                            {
                                                label: "VOLUME TOTAL",
                                                value: `${(consumoStats.kpis?.latestTotal ?? 0).toFixed(2)} m³`,
                                                icon: <TrendingUp />,
                                                variant: "indigo",
                                                subtext: "Última Apuração"
                                            },
                                            {
                                                label: "MÉDIA POR UNIDADE",
                                                value: `${(consumoStats.kpis?.avgPerUnit ?? 0).toFixed(2)} m³`,
                                                icon: <PieChartIcon />,
                                                variant: "slate",
                                                subtext: "Rateio Médio"
                                            },
                                            {
                                                label: "CUSTO MÉDIO",
                                                value: (consumoStats.kpis.totalValue ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                                icon: <DollarSign />,
                                                variant: "amber",
                                                subtext: "Projeção Total"
                                            }
                                        ]}
                                    />
                                </div>
                                {/* Line Chart Section */}
                                <HabitaCard padding="none" className="border-slate-200 shadow-sm overflow-hidden">
                                    <HabitaCardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 p-4 md:p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                                                <Zap size={20} />
                                            </div>
                                            <div>
                                                <HabitaCardTitle className="text-base text-slate-900 border-none p-0 tracking-tight">Histórico Mensal de Consumo</HabitaCardTitle>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Curva de consumo global (últimos 12 meses)</p>
                                            </div>
                                        </div>
                                        <HabitaButton
                                            onClick={() => exportPDF('consumo')}
                                            variant="outline"
                                            size="sm"
                                            icon={<FileDown size={14} />}
                                        >
                                            Exportar PDF
                                        </HabitaButton>
                                    </HabitaCardHeader>
                                    <div className="p-4 md:p-6">
                                        <div className="w-full h-[300px] min-w-0 border border-slate-100 rounded-2xl p-6 bg-slate-50/30 relative">
                                            {consumoStats.chartData.length > 0 ? (
                                                <ResponsiveContainer width="100%" height={300} minWidth={0}>
                                                    <LineChart data={consumoStats.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                        <XAxis dataKey="name" fontSize={10} fontWeight="800" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                                        <YAxis fontSize={10} fontWeight="800" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1' }} tickFormatter={(v) => `${v}m³`} />
                                                        <Tooltip formatter={(val: any) => [`${Number(val).toFixed(2)} m³`, 'Consumo Global']} />
                                                        <Line type="monotone" dataKey="Consumo" stroke="#3b82f6" strokeWidth={4} activeDot={{ r: 8 }} dot={{ strokeWidth: 2, r: 4 }} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            ) : <div className="h-full flex justify-center items-center text-[10px] font-bold uppercase text-slate-300">Sem dados de consumo histórico</div>}
                                        </div>
                                    </div>
                                </HabitaCard>

                                {/* Audit Table Section */}
                                <HabitaCard padding="none" className="border-slate-200 shadow-sm overflow-hidden">
                                    <HabitaCardHeader className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
                                        <div>
                                            <HabitaCardTitle className="text-sm font-black text-slate-700 border-none p-0 uppercase tracking-widest">Auditoria de Leituras e Consumo Individual</HabitaCardTitle>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Análise de variação vs média individual</p>
                                        </div>
                                        <HabitaBadge variant="indigo" size="sm">Tempo Real</HabitaBadge>
                                    </HabitaCardHeader>
                                    <div className="p-0">
                                        <HabitaTable responsive mobileVariant="list"
                                            containerClassName="border border-slate-200 rounded-xl overflow-hidden shadow-none"

                                        >
                                            <HabitaTHead>
                                                <HabitaTR>
                                                    <HabitaTH>Apto / Unidade</HabitaTH>
                                                    <HabitaTH align="right">Consumo (m³)</HabitaTH>
                                                    <HabitaTH align="right">Mês Anterior</HabitaTH>
                                                    <HabitaTH align="right">Variação (%)</HabitaTH>
                                                    <HabitaTH align="center">Status de Auditoria</HabitaTH>
                                                </HabitaTR>
                                            </HabitaTHead>
                                            <HabitaTBody>
                                                {consumoStats.auditTable.map((row: ConsumoAuditItem) => (
                                                    <HabitaTR key={row.id}>
                                                        {/* Mobile Layout - Unified Standard */}
                                                        <HabitaTD className="md:hidden pt-4 pb-2">
                                                            <div className="flex flex-col gap-3 w-full">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-slate-700 text-sm leading-tight tracking-tight">Unidade {row.id}</span>
                                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Mês Anterior: { (row.prevConsumption ?? 0).toFixed(2) } m³</span>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="font-black text-sm text-slate-900">{ (row.consumption ?? 0).toFixed(2) } m³</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={cn(
                                                                            "text-[10px] font-black px-1.5 py-0.5 rounded",
                                                                            row.variation > 0 ? (row.variation > 30 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-500') : 'bg-emerald-50 text-emerald-500'
                                                                        )}>
                                                                            {row.variation > 0 ? '+' : ''}{(row.variation ?? 0).toFixed(1)}%
                                                                        </span>
                                                                        {row.isAlert ? (
                                                                            <HabitaBadge variant="error" size="xs" className="animate-pulse">
                                                                                <AlertTriangle size={10} className="mr-1" /> ALERTA
                                                                            </HabitaBadge>
                                                                        ) : (
                                                                            <HabitaBadge variant="success" size="xs">NORMAL</HabitaBadge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </HabitaTD>

                                                        {/* Desktop Layout */}
                                                        <HabitaTD className="hidden md:table-cell font-black text-slate-700">Unidade {row.id}</HabitaTD>
                                                        <HabitaTD align="right" className="hidden md:table-cell font-black text-slate-600">{ (row.consumption ?? 0).toFixed(2) } m³</HabitaTD>
                                                        <HabitaTD align="right" className="hidden md:table-cell text-slate-400 font-medium">{ (row.prevConsumption ?? 0).toFixed(2) } m³</HabitaTD>
                                                        <HabitaTD align="right" className={cn(
                                                            "hidden md:table-cell font-black text-xs",
                                                            row.variation > 0 ? (row.variation > 30 ? 'text-rose-600' : 'text-amber-500') : 'text-emerald-500'
                                                        )}>
                                                            {row.variation > 0 ? '+' : ''}{(row.variation ?? 0).toFixed(1)}%
                                                        </HabitaTD>
                                                        <HabitaTD align="center" className="hidden md:table-cell">
                                                            {row.isAlert ? (
                                                                <HabitaBadge variant="error" size="sm" className="animate-pulse">
                                                                    <AlertTriangle size={10} className="mr-1" /> Consumo Elevado
                                                                </HabitaBadge>
                                                            ) : (
                                                                <HabitaBadge variant="success" size="sm">Normal</HabitaBadge>
                                                            )}
                                                        </HabitaTD>
                                                    </HabitaTR>
                                                ))}
                                            </HabitaTBody>
                                        </HabitaTable>
                                    </div>
                                </HabitaCard>
                            </div>
                        )}

                        {/* TAB: OPERACIONAL */}
                        {activeTab === 'operacional' && (
                            <div className="space-y-8">
                                <div className="mb-4">
                                    <div className="hidden md:block">
                                        <HabitaStatGrid 
                                            title="Indicadores de Chamados & SLA"
                                            icon={<AlertCircle className="text-amber-500" />}
                                            metrics={[
                                                {
                                                    label: "CHAMADOS TOTAIS",
                                                    value: ocorrenciasStats.total.toString(),
                                                    icon: <AlertCircle />,
                                                    variant: "amber",
                                                    subtext: "Volume Acumulado"
                                                },
                                                {
                                                    label: "TAXA DE RESOLUÇÃO",
                                                    value: `${(ocorrenciasStats.resolutionRate ?? 0).toFixed(1)}%`,
                                                    icon: <CheckCircle2 />,
                                                    variant: "emerald",
                                                    subtext: "Ocorrências Finalizadas"
                                                },
                                                {
                                                    label: "TEMPO MÉDIO (SLA)",
                                                    value: `${ocorrenciasStats.sla} Dias`,
                                                    icon: <Clock />,
                                                    variant: "indigo",
                                                    subtext: "Agilidade de Resposta"
                                                }
                                            ]}
                                            cols={3}
                                        />
                                    </div>

                                    <div className="md:hidden">
                                        <HabitaStatGrid3x1 
                                            title="Indicadores de Chamados & SLA"
                                            icon={<AlertCircle className="text-amber-500" />}
                                            metrics={[
                                                {
                                                    label: "CHAMADOS TOTAIS",
                                                    value: ocorrenciasStats.total.toString(),
                                                    icon: <AlertCircle />,
                                                    variant: "amber",
                                                    subtext: "Volume Acumulado"
                                                },
                                                {
                                                    label: "TAXA DE RESOLUÇÃO",
                                                    value: `${(ocorrenciasStats.resolutionRate ?? 0).toFixed(1)}%`,
                                                    icon: <CheckCircle2 />,
                                                    variant: "emerald",
                                                    subtext: "Ocorrências Finalizadas"
                                                },
                                                {
                                                    label: "TEMPO MÉDIO (SLA)",
                                                    value: `${ocorrenciasStats.sla} Dias`,
                                                    icon: <Clock />,
                                                    variant: "indigo",
                                                    subtext: "Agilidade de Resposta"
                                                }
                                            ]}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                    {/* Donut Status Chart */}
                                    <HabitaCard padding="none" className="border-slate-200 shadow-sm overflow-hidden bg-slate-50/20">
                                        <HabitaCardHeader className="p-4 md:p-6 border-b border-slate-100 flex items-center gap-3">
                                            <div className="p-2 bg-slate-900 text-white rounded-lg">
                                                <PieChartIcon size={18} />
                                            </div>
                                            <div>
                                                <HabitaCardTitle className="text-sm font-black text-slate-700 border-none p-0 uppercase tracking-widest">Status das Ocorrências</HabitaCardTitle>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Distribuição por situação atual</p>
                                            </div>
                                        </HabitaCardHeader>
                                        <div className="p-4 md:p-6">
                                            <div className="h-[280px] w-full relative min-w-0">
                                                {ocorrenciasStats.total > 0 ? (
                                                    <ResponsiveContainer width="100%" height={280} minWidth={0}>
                                                        <PieChart>
                                                            <Pie
                                                                data={ocorrenciasStats.statusData}
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={70}
                                                                outerRadius={100}
                                                                paddingAngle={4}
                                                                dataKey="value"
                                                                stroke="none"
                                                            >
                                                                { (ocorrenciasStats.statusData || []).map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip />
                                                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-full opacity-30">
                                                        <PieChartIcon size={48} className="mb-2" />
                                                        <p className="text-xs font-black uppercase tracking-widest">Sem registros</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </HabitaCard>

                                    {/* Category Bar Chart */}
                                    <HabitaCard padding="none" className="border-slate-200 shadow-sm overflow-hidden bg-slate-50/20">
                                        <HabitaCardHeader className="p-4 md:p-6 border-b border-slate-100 flex items-center gap-3">
                                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                                <Tag size={18} />
                                            </div>
                                            <div>
                                                <HabitaCardTitle className="text-sm font-black text-slate-700 border-none p-0 uppercase tracking-widest">Categorias Frequentes</HabitaCardTitle>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Volume por tipo de demanda</p>
                                            </div>
                                        </HabitaCardHeader>
                                        <div className="p-4 md:p-6">
                                            <div className="h-[280px] w-full min-w-0 relative">
                                                { (ocorrenciasStats.categoryData || []).length > 0 ? (
                                                    <ResponsiveContainer width="100%" height={280} minWidth={0}>
                                                        <BarChart data={ocorrenciasStats.categoryData} layout="vertical" margin={{ left: 20, right: 20 }}>
                                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                                            <XAxis type="number" hide />
                                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={10} width={100} tick={{ fontWeight: '800', fill: '#64748b' }} />
                                                            <Tooltip cursor={{ fill: '#f8fafc' }} />
                                                            <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-full opacity-30">
                                                        <Tag size={48} className="mb-2" />
                                                        <p className="text-xs font-black uppercase tracking-widest">Nenhuma demanda registrada</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </HabitaCard>
                                </div>

                                {/* Critical Table */}
                                <HabitaCard padding="none" className="border-rose-200 shadow-sm overflow-hidden">
                                    <HabitaCardHeader className="bg-rose-50/50 p-4 md:p-6 border-b border-rose-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-sm">
                                                <AlertTriangle size={20} />
                                            </div>
                                            <div>
                                                <HabitaCardTitle className="text-base text-rose-900 border-none p-0 tracking-tight">Ocorrências Críticas Prioritárias</HabitaCardTitle>
                                                <p className="text-[10px] text-rose-600 font-black uppercase tracking-widest mt-0.5 whitespace-nowrap">Tickets pendentes de alta criticidade</p>
                                            </div>
                                        </div>
                                        <HabitaButton
                                            onClick={() => exportPDF('operacional')}
                                            variant="danger"
                                            size="sm"
                                            icon={<FileDown size={14} />}
                                        >
                                            Relatório de Atividades
                                        </HabitaButton>
                                    </HabitaCardHeader>
                                    <div className="p-0">
                                        <HabitaTable responsive mobileVariant="list"
                                            containerClassName="border border-slate-200 rounded-xl overflow-hidden shadow-none"

                                        >
                                            <HabitaTHead>
                                                <HabitaTR>
                                                    <HabitaTH>Título / Chamado</HabitaTH>
                                                    <HabitaTH>Categoria</HabitaTH>
                                                    <HabitaTH>Abertura</HabitaTH>
                                                    <HabitaTH>Unidade</HabitaTH>
                                                </HabitaTR>
                                            </HabitaTHead>
                                            <HabitaTBody>
                                                {ocorrenciasStats.criticalList.length > 0 ? ocorrenciasStats.criticalList.map((oc: Ocorrencia) => (
                                                    <HabitaTR key={oc.id}>
                                                        {/* Mobile Layout - Unified Standard */}
                                                        <HabitaTD className="md:hidden pt-4 pb-2">
                                                            <div className="flex flex-col gap-3 w-full">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-slate-700 text-sm leading-tight tracking-tight">{oc.titulo}</span>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <HabitaBadge variant="neutral" size="xs">{oc.categoria}</HabitaBadge>
                                                                            <span className="text-[10px] text-slate-400 font-black italic">{new Date(oc.dataAbertura).toLocaleDateString('pt-BR')}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="font-black text-[10px] text-slate-500 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded">APT {oc.unitId || '---'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </HabitaTD>

                                                        {/* Desktop Layout */}
                                                        <HabitaTD className="hidden md:table-cell font-black text-slate-700">{oc.titulo}</HabitaTD>
                                                        <HabitaTD className="hidden md:table-cell">
                                                            <HabitaBadge variant="neutral" size="sm">{oc.categoria}</HabitaBadge>
                                                        </HabitaTD>
                                                        <HabitaTD className="hidden md:table-cell text-[10px] text-slate-400 font-black italic">{new Date(oc.dataAbertura).toLocaleDateString('pt-BR')}</HabitaTD>
                                                        <HabitaTD className="hidden md:table-cell font-black text-slate-600">APT {oc.unitId || '---'}</HabitaTD>
                                                    </HabitaTR>
                                                )) : (
                                                    <HabitaTR>
                                                        <HabitaTD colSpan={4} className="py-12 text-center w-full">
                                                            <div className="flex flex-col items-center w-full">
                                                                <CheckCircle2 size={40} className="mb-3 text-emerald-200" />
                                                                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Caminho operacional livre</p>
                                                            </div>
                                                        </HabitaTD>
                                                    </HabitaTR>
                                                )}
                                            </HabitaTBody>
                                        </HabitaTable>
                                    </div>
                                </HabitaCard>
                            </div>
                        )}
                    </div>
                )}
            </HabitaCard>
        </div>
    );
};

export default ReportsPage;
