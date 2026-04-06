import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import api from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Calendar, Sparkles, Plus, ArrowRightLeft, CheckCircle2, Check, Download, Building2, ArrowRight, LogOut, DollarSign, Info, AlertTriangle, Megaphone, Zap, Shield, Wrench, FileText, ChevronRight, MessageSquare } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
import { generateReceiptPDF } from '../utils/ReceiptGenerator';
import { calcularEncargos, formatCurrency } from '../utils/FinanceUtils';
import { generatePixPayload } from '../utils/PixUtils';
import { QRCodeSVG } from 'qrcode.react';
import { HabitaSpinner } from '../components/ui/HabitaSpinner';
import { HabitaTooltip } from '../components/ui/HabitaTooltip';
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaHeading } from '../components/ui/HabitaHeading';
import { HabitaStatGrid } from '../components/ui/HabitaStatGrid';
import { HabitaStatCard } from '../components/ui/HabitaStatCard';
import { HabitaChartContainer } from '../components/ui/HabitaChartContainer';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaCard, HabitaCardHeader, HabitaCardTitle } from '../components/ui/HabitaCard';
import { HabitaInput } from '../components/ui/HabitaForm';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaAvatar } from '../components/ui/HabitaAvatar';
import { HabitaTable } from '../components/ui/HabitaTable';
import { HabitaCombobox } from '../components/ui/HabitaCombobox';
import { HabitaShortcut } from '../components/ui/HabitaShortcut';
import { HabitaIconActionButton } from '../components/ui/HabitaIconActionButton';
export interface UnitType { id: string; name: string; baseFee: number; [key: string]: any; }
export interface Unit { id: string; ownerName: string; typeId: string; lastGasReading: number; currentGasReading: number; status?: string; paymentDate?: string; [key: string]: any; }
export interface Setting { condoName: string; currentRefMonth: string; gasPrice: number; dueDay: number; unitTypes: UnitType[]; [key: string]: any; }
export interface HistoryRecord {
  id: string;
  referenceMonth: string;
  dueDate: string;
  gasPrice: number;
  units: Unit[];
  unitTypes: UnitType[];
  extraFees: any[];
  [key: string]: any;
}
export interface MuralNotice {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  type: 'urgent' | 'info' | 'event';
  authorName: string;
  date: string;
  readBy: string[];
  [key: string]: any;
}
export interface Manutencao {
  id: string;
  titulo: string;
  frequenciaMeses: number;
  ultimaRealizacao: string;
  proximaData: string;
  status: 'em_dia' | 'atrasado';
}
export interface BankAccount { id: string; name: string; currentBalance: number; status: 'ativa' | 'inativa'; [key: string]: any; }
export interface Area { id: string; nome: string; capacidade: number; status: 'ativo' | 'inativo' | 'manutencao'; [key: string]: any; }
export interface Reserva { id: string; areaId: string; data: string; unitId: string; [key: string]: any; }
export interface Ocorrencia { id: string; title: string; categoria: string; status: 'Pendente' | 'Resolvida' | 'Em Aberto'; [key: string]: any; }

import { useAuth } from '../contexts/AuthContext';
import { hasPermission } from '../utils/rbac';
// import { condoService } from '../services/CondoService';
import * as XLSX from 'xlsx';


import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const DashboardPage = () => {
    const { user, isAdmin, isOperator, accessProfile, profile, signOut: authSignOut } = useAuth();
    const navigate = useNavigate();

    // --- ESTADO LOCAL ---
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Modais e UI
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
    const [isStartModalOpen, setIsStartModalOpen] = useState(false);
    const [isCheckingMonthData, setIsCheckingMonthData] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isBankDetailsModalOpen, setIsBankDetailsModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isPixModalOpen, setIsPixModalOpen] = useState(false);
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const [showInstallBanner, setShowInstallBanner] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Referência e Seleções
    const [activeRefMonth, setActiveRefMonth] = useState('');
    const [pendingRef, setPendingRef] = useState('');
    const [detailsType, setDetailsType] = useState<'reading' | 'payment_atrasado' | 'payment_inadimplente'>('reading');
    const [selectedNotice, setSelectedNotice] = useState<MuralNotice | null>(null);
    const [selectedUnitForPayment, setSelectedUnitForPayment] = useState<Unit | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentReferenceMonth, setPaymentReferenceMonth] = useState('');
    const [selectedUnitForPix, setSelectedUnitForPix] = useState<Unit | null>(null);
    const [selectedRecordForPix, setSelectedRecordForPix] = useState<HistoryRecord | null>(null);
    const [copied, setCopied] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [summary, setSummary] = useState<any>(null);

    // Onboarding Wizard
    const [wizardStep, setWizardStep] = useState(1);
    const [wizardData, setWizardData] = useState({
        condoName: '',
        cnpj: '',
        gasPrice: 0,
        pixKey: '',
        unitTypeName: 'Apartamento Padrão',
        unitTypeBase: 0,
        unitsInput: ''
    });
    const [importMode, setImportMode] = useState<"manual" | "excel" | null>(null);
    const [wizardFile, setWizardFile] = useState<File | null>(null);
    const [wizardPreviewData, setWizardPreviewData] = useState<any[]>([]);
    const [wizardInvalidTypes, setWizardInvalidTypes] = useState<string[]>([]);
    const fileWizardRef = useRef<HTMLInputElement>(null);

    // --- AUXILIARES E DERIVADOS ---
    const isAnyOperator = useMemo(() => {
        const r = profile?.role?.toLowerCase();
        return isOperator || r === 'operator' || r === 'zelador' || r === 'sindico';
    }, [isOperator, profile?.role]);

    const fetchDashboardData = useCallback(async (selectedMonth?: string) => {
        setIsLoading(true);
        try {
            // Coletar todos os IDs de unidades vinculadas (próprio + vinculos adicionais)
            const allMyUnitIds = new Set<string>();
            if (profile?.unitId) allMyUnitIds.add(String(profile.unitId).trim());
            if (profile?.vinculos) {
                profile.vinculos.forEach((v: any) => {
                    if (v.unitId) allMyUnitIds.add(String(v.unitId).trim());
                });
            }
            
            const idsList = Array.from(allMyUnitIds).join(',');
            const unitParam = idsList ? `&unitId=${encodeURIComponent(idsList)}` : '';
            
            const summaryUrl = selectedMonth 
                ? `/condo/dashboard-summary?month=${encodeURIComponent(selectedMonth)}${unitParam}` 
                : `/condo/dashboard-summary${unitParam ? '?' + unitParam.substring(1) : ''}`;

            const [syncRes, summaryRes] = await Promise.all([
                api.get('/condo/sync'),
                api.get(summaryUrl)
            ]);
            
            const data = syncRes.data?.data || syncRes.data;
            const sumData = summaryRes.data?.data || summaryRes.data;
            
            setDashboardData(data);
            setSummary(sumData);
            
            // Onboarding Check
            const s = data?.settings;
            const isSetupNeeded = isAdmin && s && (
                !s.condoName || 
                s.condoName === 'Configuração não encontrada' || 
                s.condoName === 'Novo Condomínio' || 
                s.condoName === 'Condomínio não encontrado'
            );


            if (isSetupNeeded) {
                setIsOnboardingOpen(true);
            }
        } catch (err: any) {
            console.error("Dashboard Fetch Error:", err);
            showToast("Erro ao sincronizar dados.", "error");
        } finally {
            setIsLoading(false);
        }
    }, [isAdmin, profile?.unitId, JSON.stringify(profile?.vinculos)]);

    useEffect(() => {
        fetchDashboardData(activeRefMonth || undefined);
    }, [fetchDashboardData, activeRefMonth]);

    const reloadCondoData = fetchDashboardData;
    const settings: Setting = dashboardData?.settings || { condoName: 'Carregando...', currentRefMonth: '', gasPrice: 0, dueDay: 10, unitTypes: [] };
    const allUnits: Unit[] = dashboardData?.units || [];
    const history: HistoryRecord[] = (dashboardData?.history as any) || [];
    const notices: MuralNotice[] = dashboardData?.notices || [];
    const manutencoes: Manutencao[] = dashboardData?.manutencoes || [];
    const bankAccounts: BankAccount[] = dashboardData?.bankAccounts || [];
    const ocorrencias = dashboardData?.ocorrencias || [];
    const dashboardStats = dashboardData?.dashboardStats || { 
        cash: 0, reserve: 0, banks: 0, activeBanksCount: 0, 
        atrasadoValue: 0, inadimplenteValue: 0,
        pendentes: 0, vencidas: 0, reservasHj: 0
    };
    const packages = dashboardData?.packages || [];
    const areas: Area[] = dashboardData?.areas || [];
    const reservas: Reserva[] = dashboardData?.reservas || [];

    const showToast = (window as any).showToast || (() => {});
    const canSeeMural = isAdmin || hasPermission(accessProfile, 'mural', 'own');
    const canSeeFinancial = isAdmin || hasPermission(accessProfile, 'financial', 'all');
    const canSeeHistory = isAdmin || hasPermission(accessProfile, 'history', 'all');
    const canSeeOcorrencias = isAdmin || hasPermission(accessProfile, 'ocorrencias', 'own');
    const canSeePortaria = isAdmin || hasPermission(accessProfile, 'access', 'own');
    const canSeeReservas = isAdmin || hasPermission(accessProfile, 'areas', 'own');
    const canManageReservas = isAdmin || hasPermission(accessProfile, 'areas', 'all');
    const canSeeContact = isAdmin || hasPermission(accessProfile, 'contact', 'own') || !isAdmin; 
    const visibleNotices = useMemo(() => notices.filter(n => n.status === 'approved' && !n.isArchived), [notices]);


    const myUnits = useMemo(() => {
        const allMyUnitIds = new Set<string>();
        if (profile?.unitId) allMyUnitIds.add(String(profile.unitId).trim().toLowerCase());
        if (profile?.vinculos) {
            profile.vinculos.forEach((v: any) => {
                if (v.unitId) allMyUnitIds.add(String(v.unitId).trim().toLowerCase());
            });
        }
        
        const isMatch = (id1: string | null | undefined, id2: string | null | undefined) => {
            if (!id1 || !id2) return false;
            const a = String(id1).toLowerCase().trim();
            const b = String(id2).toLowerCase().trim();
            return a === b || a.endsWith(`_${b}`) || a.endsWith(`-${b}`) || b.endsWith(`_${a}`) || b.endsWith(`-${a}`);
        };

        return allUnits.filter(u => {
            return Array.from(allMyUnitIds).some(id => isMatch(u.id, id));
        });
    }, [allUnits, profile?.unitId, profile?.vinculos]);

    const myUnit = myUnits[0] || null;

    const isBillPayer = useMemo(() => {
        if (isAdmin) return true;
        if (myUnits.length === 0) return false;
        // Se é dono de qualquer uma das unidades vinculadas, ele paga boletos
        return myUnits.some(u => u.residentType !== 'tenant' || (u.ownerId === profile?.uid && !!u.ownerId));
    }, [isAdmin, myUnits, profile?.uid]);

    // Action Handlers
    const markNoticeAsRead = async (id: string) => {
        await api.post(`/condo/mural/${id}/read`);
        await reloadCondoData();
    };

    const sendNotification = async (notif: any) => {
        try { await api.post('/condo/notifications', notif); } catch (e) {}
    };

    const confirmUnitPayment = async (recordId: string | null, uId: string, amount: number, date: string) => {
        await api.post(`/units/${uId}/payment`, { recordId, amount, date });
        await reloadCondoData();
    };

    const closeMonth = async (month: string, data?: any) => {
        await api.post('/finance/close-month', { month, ...data });
        await reloadCondoData();
    };

    const initNewMonth = async (month: string) => {
        setIsInitializing(true);
        try {
            await api.post('/condo/init-month', { month });
            await reloadCondoData();
        } catch (err: any) {
            console.error("Init Month Error:", err);
            showToast("Erro ao iniciar mês.", "error");
        } finally {
            setIsInitializing(false);
        }
    };



    const updateSettings = async (s: any) => {
        await api.put('/condo/settings', s);
        await reloadCondoData();
    };

    const calculateRecordTotal = (unit: any) => {
        if (!unit) return 0;
        return unit.calculatedTotal || unit.amountPaid || 0;
    };


    const myPackages = useMemo(() => {
        if (myUnits.length === 0 || !packages) return [];
        const myUnitIds = myUnits.map(u => String(u.id).toLowerCase());
        
        const isMatch = (id1: string | null | undefined, id2: string | null | undefined) => {
            if (!id1 || !id2) return false;
            const a = String(id1).toLowerCase().trim();
            const b = String(id2).toLowerCase().trim();
            return a === b || a.endsWith(`_${b}`) || a.endsWith(`-${b}`) || b.endsWith(`_${a}`) || b.endsWith(`-${a}`);
        };
        
        return packages.filter((p: any) => {
            return myUnitIds.some(id => isMatch(p.unitId, id)) && p.status === 'aguardando';
        });
    }, [packages, myUnits]);

    const myNextReserva = useMemo(() => {
        if (myUnits.length === 0 || !reservas || !areas) return null;
        const myUnitIds = myUnits.map(u => String(u.id).toLowerCase());
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        const isMatch = (id1: string | null | undefined, id2: string | null | undefined) => {
            if (!id1 || !id2) return false;
            const a = String(id1).toLowerCase().trim();
            const b = String(id2).toLowerCase().trim();
            return a === b || a.endsWith(`_${b}`) || a.endsWith(`-${b}`) || b.endsWith(`_${a}`) || b.endsWith(`-${a}`);
        };
        
        const filteredReservas = reservas.filter((r: Reserva) => {
            return myUnitIds.some(id => isMatch(r.unitId, id)) &&
                   r.status === 'confirmada' &&
                   new Date(r.data + 'T12:00:00') >= now;
        });
        const found = [...filteredReservas].sort((a: Reserva, b: Reserva) => new Date(a.data).getTime() - new Date(b.data).getTime())[0];
        if (!found) return null;
        const area = areas.find((a: Area) => a.id === found.areaId);
        return { ...found, areaName: area?.nome || 'Área Comum' };
    }, [reservas, areas, myUnits]);

    const manutencoesComStatus = useMemo(() => {
        return manutencoes || [];
    }, [manutencoes]);

    const handleMarkAsRead = async () => {
        if (selectedNotice) {
            await markNoticeAsRead(selectedNotice.id);
            setSelectedNotice(null);
        }
    };

    const handleDownloadAction = async (targetRefMonth: string) => {
        const targetRecord = history.find(h => h.referenceMonth === targetRefMonth);
        if (!targetRecord) return;
        const myUnitIds = myUnits.map(mu => String(mu.id).toLowerCase().trim());
        const targetUnit = targetRecord.units.find((u: Unit) => {
            const uId = String(u.id).toLowerCase().trim();
            return myUnitIds.some(id => uId === id || uId.endsWith(`_${id}`) || uId.endsWith(`-${id}`) || id.endsWith(`_${uId}`) || id.endsWith(`-${uId}`));
        });
        if (!targetUnit) return;
        const activeBank = bankAccounts.find(b => b.status === 'ativa') || bankAccounts[0];
        await generateReceiptPDF({
            unit: targetUnit,
            settings,
            bankAccount: activeBank,
            referenceMonth: targetRefMonth,
            historyRecord: targetRecord,
            type: targetUnit.paymentDate ? 'recibo' : 'fatura'
        });
    };

    const handlePixOpen = (ref: string) => {
        const rec = history.find(h => h.referenceMonth === ref);
        if (rec && myUnit) {
            setSelectedRecordForPix(rec);
            setSelectedUnitForPix(myUnit);
            setIsPixModalOpen(true);
        }
    };

    const handleWizardNext = () => setWizardStep(prev => prev + 1);
    const handleWizardPrev = () => setWizardStep(prev => prev - 1);

    const handleFileUploadWizard = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setWizardFile(file);
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            if (typeof bstr !== 'string') return;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);
            setWizardPreviewData(data);
            const invalid = (data as any[]).filter(row => row.Tipologia !== wizardData.unitTypeName).map(row => row.Tipologia);
            setWizardInvalidTypes([...new Set(invalid)]);
        };
        reader.readAsBinaryString(file);
    };

    const handleWizardComplete = async () => {
        setIsInitializing(true);
        try {
            const unitTypeId = Date.now().toString(36);
            const newSettings = {
                ...settings,
                condoName: wizardData.condoName,
                cnpj: wizardData.cnpj,
                gasPrice: wizardData.gasPrice,
                pixKey: wizardData.pixKey,
                unitTypes: [{ id: unitTypeId, name: wizardData.unitTypeName, baseFee: wizardData.unitTypeBase || 0 }]
            };
            let unitsToCreate = [];
            if (importMode === 'manual') {
                unitsToCreate = wizardData.unitsInput.split(',').map(u => ({ id: u.trim(), typeId: unitTypeId, ownerName: `Unidade ${u.trim()}` }));
            } else {
                unitsToCreate = wizardPreviewData.map(row => ({ id: String(row.Unidade || row.ID), typeId: unitTypeId, ownerName: row.Proprietário || 'Proprietário' }));
            }
            await api.post('/condo/setup', { settings: newSettings, units: unitsToCreate });
            showToast("Configurado!", "success");
            setIsOnboardingOpen(false);
            await reloadCondoData();
        } catch (err) {
            showToast("Erro.", "error");
        } finally {
            setIsInitializing(false);
        }
    };

    useEffect(() => {
        if (!isLoading && settings.condoName) {
            setWizardData(prev => ({
                ...prev,
                condoName: settings.condoName || prev.condoName,
                cnpj: settings.cnpj || prev.cnpj,
                gasPrice: settings.gasPrice || prev.gasPrice,
                pixKey: settings.pixKey || prev.pixKey
            }));
        }
    }, [isLoading, settings.condoName, settings.cnpj, settings.gasPrice, settings.pixKey]);

    const handleRefMonthChange = async (val: any) => {
        if (isAdmin && val === monthOptions.next && !monthOptions.history.includes(val)) {
            setPendingRef(val);
            setIsCheckingMonthData(true);
            try {
                const response = await api.get(`/history/check?month=${val}`);
                if (response.data.exists) {
                    setActiveRefMonth(val);
                    await reloadCondoData();
                } else {
                    setIsStartModalOpen(true);
                }
            } catch (err) {
                setIsStartModalOpen(true);
            } finally {
                setIsCheckingMonthData(false);
            }
        } else {
            setActiveRefMonth(val);
        }
    };


    const monthOptions = useMemo(() => {
        const sortedHistory = [...history].sort((a: any, b: any) => {
            if (!a.referenceMonth || !b.referenceMonth) return 0;
            const [mA, yA] = a.referenceMonth.split('/').map(Number);
            const [mB, yB] = b.referenceMonth.split('/').map(Number);
            if (yA !== yB) return yB - yA;
            return mB - mA;
        });

        let nextMStr = '';
        if (sortedHistory.length > 0) {
            const last = sortedHistory[0];
            const [m, y] = last.referenceMonth.split('/').map(Number);
            let nM = m + 1;
            let nY = y;
            if (nM > 12) { nM = 1; nY++; }
            nextMStr = `${nM.toString().padStart(2, '0')}/${nY}`;
        } else {
            const now = new Date();
            nextMStr = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
        }
        return { next: nextMStr, history: sortedHistory.map(h => h.referenceMonth) };
    }, [history]);

    const refMonthOptions = useMemo(() => {
        const activeLabel = isAdmin && settings.currentRefMonth === monthOptions.next ? '• ABERTO' : '• PREV';
        const activeOption = {
            value: monthOptions.next,
            label: `${monthOptions.next} ${activeLabel}`
        };
        const historyOptions = monthOptions.history
            .filter(m => m !== monthOptions.next)
            .map(m => ({
                value: m,
                label: `${m} • FECHADO`
            }));
        return [activeOption, ...historyOptions];
    }, [monthOptions, isAdmin, settings.currentRefMonth]);

    useEffect(() => {
        if (!isAdmin && !isAnyOperator) {
            if (settings.currentRefMonth && activeRefMonth !== settings.currentRefMonth) {
                setActiveRefMonth(settings.currentRefMonth);
            }
            return;
        }
        if (!activeRefMonth) {
            if (settings.currentRefMonth) {
                setActiveRefMonth(settings.currentRefMonth);
            } else if (history.length > 0) {
                setActiveRefMonth(history[0].referenceMonth);
            } else {
                const now = new Date();
                setActiveRefMonth(`${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`);
            }
        }
    }, [activeRefMonth, settings.currentRefMonth, history, isAdmin, isAnyOperator]);

    const currentRecord = useMemo(() =>
        history.find(h => h.referenceMonth === activeRefMonth),
        [history, activeRefMonth]);

    const stats = useMemo(() => {
        // Agora 100% dos dados vêm da API, garantindo a fonte única de verdade
        const paidUnits = summary?.paidUnits ?? 0;
        const upcomingUnits = summary?.upcomingUnits ?? 0;
        const overdueUnits = summary?.overdueUnits ?? 0;
        const pendingReadings = summary?.pendingReadings ?? 0;
        const currentRefOpenUnits = summary?.totalPendingUnits ?? 0;
        const currentRefOpenValue = summary?.totalPendingValue ?? 0;
        const hasCurrentRefFaturas = !!summary?.totalPendingUnits || !!summary?.paidUnits || !!summary?.upcomingUnits || !!summary?.overdueUnits;

        return {
            paidUnits, upcomingUnits, overdueUnits, pendingReadings,
            currentRefOpenUnits, 
            currentRefOpenValue, 
            hasCurrentRefFaturas,
            cash: summary?.cash ?? (dashboardStats?.cash || 0),
            reserve: summary?.reserve ?? (dashboardStats?.reserve || 0),
            banks: summary?.banks ?? (dashboardStats?.banks || 0),
            atrasadoValue: summary?.atrasadoValue ?? (dashboardStats?.atrasadoValue || 0),
            inadimplenteValue: summary?.inadimplenteValue ?? (dashboardStats?.inadimplenteValue || 0),
            pendentes: summary?.pendentes ?? (dashboardStats?.pendentes || 0),
            vencidas: summary?.vencidas ?? (dashboardStats?.vencidas || 0),
            reservasHj: summary?.reservasHj ?? (dashboardStats?.reservasHj || 0),
            totalIncomes: summary?.totalIncomes ?? 0,
            totalExpenses: summary?.totalExpenses ?? 0
        };
    }, [summary, dashboardStats]);

    const pendingUnitsList = useMemo(() => {
        const targetUnits = currentRecord ? currentRecord.units : allUnits;
        return (targetUnits || []).filter((unit: any) => {
            if (detailsType === 'reading') {
                if (currentRecord) {
                    return (unit.currentGasReading || 0) <= 0;
                } else {
                    return (unit.currentGasReading || 0) <= 0;
                }
            } else {
                return !(unit.status === 'pago' || unit.paymentDate);
            }
        });
    }, [allUnits, currentRecord, detailsType]);

    // Chart Data (Now provided by API)
    const chartData = useMemo(() => {
        return summary?.globalConsumptionChart || [];
    }, [summary]);


    // Chart Data Generation (Last 6 months) - Per Unit (for Residents)
    const userChartData = useMemo(() => {
        return summary?.userConsumptionChart || [];
    }, [summary]);

    // Calculate all overdue months for the resident's unit
    // Calculate overdue vs open months for the resident's unit
    const invoiceStatus = useMemo(() => {
        if (isAdmin || myUnits.length === 0) return { overdue: [], open: [] };

        const overdue: string[] = [];
        const open: string[] = [];
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        const myUnitIds = myUnits.map(u => String(u.id).toLowerCase());
        
        const isMatch = (id1: string | null | undefined, id2: string | null | undefined) => {
            if (!id1 || !id2) return false;
            const a = String(id1).toLowerCase().trim();
            const b = String(id2).toLowerCase().trim();
            return a === b || a.endsWith(`_${b}`) || a.endsWith(`-${b}`) || b.endsWith(`_${a}`) || b.endsWith(`-${a}`);
        };

        history.forEach((record: HistoryRecord) => {
            const hasMyUnit = record.units.some((u: Unit) => {
                return myUnitIds.some(id => isMatch(u.id, id));
            });
            
            // Check if any of my units in this record are not paid
            const hasUnpaid = record.units.some((u: Unit) => {
                const isMine = myUnitIds.some(id => isMatch(u.id, id));
                return isMine && !u.paymentDate;
            });

            if (hasMyUnit && hasUnpaid) {
                let dueDateStr = record.dueDate;
                if (!dueDateStr) {
                    dueDateStr = `${settings.dueDay.toString().padStart(2, '0')}/${record.referenceMonth}`;
                }

                try {
                    const [d, m, y] = dueDateStr.split('/').map(Number);
                    const due = new Date(y, m - 1, d, 23, 59, 59);

                    if (now > due) {
                        overdue.push(record.referenceMonth);
                    } else {
                        open.push(record.referenceMonth);
                    }
                } catch (e) {
                    console.error("Date parse error", e);
                }
            }
        });

        return { overdue, open };
    }, [isAdmin, myUnits, history, settings.dueDay]);





    // --- PWA INSTALL PROMPT ---
    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallBanner(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', () => {
            setDeferredPrompt(null);
            setShowInstallBanner(false);

        });
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;

        setDeferredPrompt(null);
        setShowInstallBanner(false);
    };

    // --- PROTEÇÃO DE DADOS (AGUARDANDO CARREGAMENTO INICIAL) ---
    // Apenas para Admin/Operador que dependem da visão geral
    if (isLoading && (isAdmin || isAnyOperator) && !dashboardData) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center bg-slate-50/50 backdrop-blur-sm rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
                    <div className="relative">
                        <HabitaSpinner size="lg" />
                        <div className="absolute inset-0 bg-indigo-500/10 blur-xl animate-pulse rounded-full" />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-[12px] font-black uppercase tracking-[0.2em] text-indigo-600/70">HabitarPleno</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Sincronizando Dados...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500 p-0 md:p-4">
            {/* Promo Banner: Instalar App (PWA) */}
            {showInstallBanner && (
                <div className="max-w-[1700px] mx-auto mb-6 animate-in slide-in-from-top-4 duration-500 px-2 lg:px-0">
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-4 rounded-3xl text-white shadow-xl shadow-indigo-200 border border-indigo-500/30 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden group">
                        {/* Brilho Animado */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />

                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
                                <Sparkles className="text-white" size={24} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-tight leading-none mb-1">Acesso Rápido</h3>
                                <p className="text-[11px] font-bold text-indigo-100 opacity-90 uppercase tracking-widest max-w-[200px] md:max-w-none">
                                    Instale o HabitarPleno para a melhor experiência no seu celular.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 relative z-10 w-full md:w-auto">
                            <button
                                onClick={() => setShowInstallBanner(false)}
                                className="px-4 h-10 text-[10px] font-black uppercase tracking-widest text-indigo-100 hover:text-white transition-colors"
                            >
                                Depois
                            </button>
                            <HabitaButton
                                onClick={handleInstallClick}
                                variant="outline"
                                size="sm"
                                className="flex-1 md:flex-none h-10 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] text-indigo-700 shadow-lg shadow-black/10 hover:scale-105 active:scale-95 transition-all bg-white border-white"
                                icon={<Plus size={16} />}
                            >
                                Instalar Agora
                            </HabitaButton>
                        </div>
                    </div>
                </div>
            )}

            <HabitaCard 
                className={cn(
                    "max-w-[1700px] mx-auto min-h-[90vh]",
                    isMobile ? "bg-transparent border-none shadow-none p-2" : "md:border md:shadow-sm"
                )} 
                padding={isMobile ? "none" : "lg"}
            >
                {/* 1. HEADER UNIFICADO (Saudação + Controles + Atalhos) */}
                <div className="space-y-6 mb-6 pb-6 border-b border-slate-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <HabitaAvatar
                                size="md"
                                src={settings.logotipoUrl || user?.photoURL || undefined}
                                name={profile?.name || 'User'}
                                className="border-indigo-100 shadow-sm"
                            />
                            <div>
                                <HabitaHeading level={1} className="mb-0 leading-tight">{`Olá, ${profile?.name?.split(' ')[0]}!`}</HabitaHeading>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                {(isAdmin || isAnyOperator) && (
                                    <HabitaCombobox
                                        options={refMonthOptions}
                                        value={activeRefMonth}
                                        onChange={handleRefMonthChange}
                                        disabled={isCheckingMonthData}
                                        containerClassName="w-56"
                                        className="h-10 text-[10px] font-black uppercase tracking-tight"
                                        label="Exercício"
                                    />
                                )}

                                {isAdmin && (
                                    <div className="pt-[18px]">
                                        <HabitaButton
                                            onClick={() => setIsCloseModalOpen(true)}
                                            disabled={!!currentRecord}
                                            variant={currentRecord ? 'outline' : 'primary'}
                                            size="sm"
                                            className="h-10"
                                            icon={<CheckCircle2 size={16} />}
                                        >
                                            {currentRecord ? 'Fechado' : 'Encerrar'}
                                        </HabitaButton>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="hidden md:grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap gap-2">
                        {canSeeOcorrencias && (
                            <HabitaShortcut
                                icon={<AlertTriangle />}
                                label="Ocorrências"
                                iconClassName="text-amber-500"
                                onClick={() => navigate('/ocorrencias')}
                                className="flex-1 min-w-[140px]"
                            />
                        )}
                        {canSeeReservas && (
                            <HabitaShortcut
                                icon={<Calendar />}
                                label="Reservas"
                                iconClassName="text-emerald-500"
                                onClick={() => navigate(canManageReservas ? "/reservas/areas" : "/reservas")}
                                className="flex-1 min-w-[140px]"
                            />
                        )}
                        {canSeePortaria && (
                            <HabitaShortcut
                                icon={<Shield />}
                                label="Portaria"
                                iconClassName="text-blue-500"
                                onClick={() => navigate('/access-control')}
                                className="flex-1 min-w-[140px]"
                            />
                        )}
                        {canSeeMural && (
                            <HabitaShortcut
                                icon={<Megaphone />}
                                label="Mural"
                                iconClassName="text-rose-500"
                                onClick={() => navigate('/mural')}
                                className="flex-1 min-w-[140px]"
                            />
                        )}
                        {canSeeHistory && (
                            <HabitaShortcut
                                icon={<FileText />}
                                label="Consumo"
                                iconClassName="text-indigo-500"
                                onClick={() => navigate('/history')}
                                className="flex-1 min-w-[140px]"
                            />
                        )}
                        {canSeeFinancial && (
                            <HabitaShortcut
                                icon={<DollarSign />}
                                label="Financeiro"
                                iconClassName="text-emerald-600"
                                onClick={() => navigate('/financial')}
                                className="flex-1 min-w-[140px]"
                            />
                        )}
                        {canSeeContact && (
                            <HabitaShortcut
                                icon={<MessageSquare />}
                                label="Fale com Síndico"
                                iconClassName="text-indigo-600"
                                onClick={() => navigate('/fale-conosco')}
                                className="flex-1 min-w-[140px]"
                            />
                        )}
                    </div>
                </div>

                <div className="flex-1 flex flex-col gap-6 min-h-0">
                    {(isAdmin || isAnyOperator) && (
                        <>
                            {/* Versão Desktop */}
                            <div className="hidden lg:block px-1">
                                <HabitaStatGrid
                                    title="Visão Geral de Fluxo e Liquidez"
                                    icon={<Building2 className="text-indigo-500" />}
                                    metrics={[
                                        {
                                            label: "BANCOS",
                                            value: (stats.banks).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                            icon: <Building2 />,
                                            variant: "indigo",
                                            subtext: `${summary?.activeBanksCount ?? dashboardStats?.activeBanksCount ?? 0} Contas Ativas`,
                                            onClick: () => setIsBankDetailsModalOpen(true)
                                        },
                                        {
                                            label: "CAIXA",
                                            value: (stats.cash).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                            icon: <DollarSign />,
                                            variant: "emerald",
                                            subtext: "Disponível"
                                        },
                                        {
                                            label: "RESERVA",
                                            value: (stats.reserve).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                            icon: <Shield />,
                                            variant: "amber",
                                            subtext: "Fundo de Obras"
                                        },
                                        {
                                            label: "ATRASADOS",
                                            value: (stats.atrasadoValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                            icon: <AlertTriangle />,
                                            variant: "rose",
                                            subtext: "Até 30 dias",
                                            onClick: () => { setDetailsType('payment_atrasado'); setIsDetailsModalOpen(true); }
                                        },
                                        {
                                            label: "INADIMPLÊNCIA",
                                            value: (stats.inadimplenteValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                            icon: <AlertCircle />,
                                            variant: "rose-solid",
                                            subtext: "Mais de 30 dias",
                                            onClick: () => { setDetailsType('payment_inadimplente'); setIsDetailsModalOpen(true); }
                                        }
                                    ]}
                                    cols={5}
                                />
                            </div>

                            {/* Versão Mobile - Separando Bancos em card destaque */}
                            <div className="block lg:hidden px-1 space-y-4">
                                <HabitaStatCard
                                    label="BANCOS (SALDO TOTAL)"
                                    value={(stats.banks).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    icon={<Building2 />}
                                    variant="indigo"
                                    subtext={<span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{summary?.activeBanksCount ?? dashboardStats?.activeBanksCount ?? 0} Contas Bancárias Ativas</span>}
                                    onClick={() => setIsBankDetailsModalOpen(true)}
                                />

                                <HabitaStatGrid
                                    title="Fluxo & Adimplência"
                                    icon={<Zap className="text-amber-500" />}
                                    metrics={[
                                        {
                                            label: "CAIXA",
                                            value: (stats.cash).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                            icon: <DollarSign />,
                                            variant: "emerald",
                                            subtext: "Disponível"
                                        },
                                        {
                                            label: "RESERVA",
                                            value: (stats.reserve).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                            icon: <Shield />,
                                            variant: "amber",
                                            subtext: "Fundo Obras"
                                        },
                                        {
                                            label: "ATRASADOS",
                                            value: (stats.atrasadoValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                            icon: <AlertTriangle />,
                                            variant: "rose",
                                            subtext: "Até 30 dias",
                                            onClick: () => { setDetailsType('payment_atrasado'); setIsDetailsModalOpen(true); }
                                        },
                                        {
                                            label: "INADIMPLÊNCIA",
                                            value: (stats.inadimplenteValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                            icon: <AlertCircle />,
                                            variant: "rose-solid",
                                            subtext: "+30 dias",
                                            onClick: () => { setDetailsType('payment_inadimplente'); setIsDetailsModalOpen(true); }
                                        }
                                    ]}
                                    cols={2}
                                />
                            </div>
                        </>
                    )}


                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                        {/* COLUNA ESQUERDA: Conteúdo Principal (8/12) - min-w-0 fix para Recharts */}
                        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 overflow-y-auto scrollbar-hide pr-1 min-w-0">

                            {/* 1. VISÃO DO RESIDENTE */}
                            {!isAdmin && !isAnyOperator && (
                                myUnits.length > 0 ? (
                                <div className="flex flex-col gap-8">
                                    {/* Card Pessoal do Residente */}
                                    <HabitaCard variant="indigo" padding="lg" className="relative group overflow-hidden">
                                        <div className="absolute -right-10 -bottom-16 opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                                            <CheckCircle2 size={240} />
                                        </div>

                                        <div className="relative z-10">
                                            {(() => {
                                                const { overdue, open } = invoiceStatus;
                                                const hasOverdue = overdue.length > 0;
                                                const hasOpen = open.length > 0;



                                                if (hasOverdue) {
                                                    return (
                                                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                                            <div className="flex-1 text-center md:text-left">
                                                                <HabitaHeading level={2} className="text-white">Pendência Financeira</HabitaHeading>
                                                                <p className="text-indigo-100 font-medium opacity-90 mt-1">
                                                                    {isBillPayer
                                                                        ? 'Identificamos boletos em atraso. Regularize agora via PIX.'
                                                                        : 'Atenção: Existem pendências nesta unidade. O proprietário já foi notificado.'}
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-wrap justify-center gap-3">
                                                                {isBillPayer && (
                                                                    <>
                                                                        <HabitaButton onClick={() => handlePixOpen(overdue[0])} variant="secondary" className="bg-white text-indigo-600 hover:bg-slate-50" icon={<Zap size={16} />}>
                                                                            PIX Rápido
                                                                        </HabitaButton>
                                                                        <HabitaButton onClick={() => handleDownloadAction(overdue[0])} variant="danger" icon={<Download size={16} />}>
                                                                            Ver PDF
                                                                        </HabitaButton>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                } else if (hasOpen) {
                                                    return (
                                                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                                            <div className="flex-1 text-center md:text-left">
                                                                <HabitaHeading level={2} className="text-white">Próxima Fatura Disponível</HabitaHeading>
                                                                <p className="text-indigo-100 font-medium opacity-90 mt-1">A fatura de {open[0]} já pode ser paga.</p>
                                                            </div>
                                                            <div className="flex flex-wrap justify-center gap-3">
                                                                {isBillPayer ? (
                                                                    <>
                                                                        <HabitaButton onClick={() => handlePixOpen(open[0])} variant="secondary" className="bg-white text-indigo-600 hover:bg-slate-50" icon={<Zap size={16} />}>
                                                                            Pagar PIX
                                                                        </HabitaButton>
                                                                        <HabitaButton onClick={() => handleDownloadAction(open[0])} variant="outline" className="text-white border-white/20 hover:bg-white/10" icon={<Download size={16} />}>
                                                                            Detalhes
                                                                        </HabitaButton>
                                                                    </>
                                                                ) : (
                                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg text-[10px] font-bold text-white uppercase italic">
                                                                        Acesso restrito proprietário
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                                                            <CheckCircle2 className="text-emerald-300" size={32} />
                                                        </div>
                                                        <div>
                                                            <HabitaHeading level={2} className="text-white">Tudo em dia!</HabitaHeading>
                                                            <p className="text-indigo-100 font-medium mt-1 opacity-90">Não existem faturas pendentes para sua unidade.</p>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </HabitaCard>

                                    {/* 2. MURAL DE AVISOS (Focado no Morador) */}
                                    <HabitaCard variant="white" padding="md" className="border-slate-200 shadow-none lg:hidden">
                                        <HabitaCardHeader className="p-0 border-none mb-4">
                                            <HabitaCardTitle className="flex items-center gap-2">
                                                <Megaphone size={16} className="text-amber-500" /> Mural de Avisos
                                            </HabitaCardTitle>
                                            <button
                                                onClick={() => navigate('/mural')}
                                                className="text-[10px] font-black text-indigo-600 uppercase tracking-widest transition-colors flex items-center gap-1"
                                            >
                                                Ver Tudo <ArrowRight size={12} />
                                            </button>
                                        </HabitaCardHeader>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {visibleNotices.slice(0, 3).map((notice: MuralNotice) => (
                                                <div
                                                    key={notice.id}
                                                    onClick={() => setSelectedNotice(notice)}
                                                    className="relative pl-3 py-2 group cursor-pointer border border-slate-100 rounded-md hover:bg-slate-50 transition-colors"
                                                >
                                                    <div className={cn(
                                                        "absolute left-0 top-2 bottom-2 w-1 rounded-full",
                                                        notice.type === 'urgent' ? 'bg-rose-500' :
                                                            notice.type === 'event' ? 'bg-emerald-500' : 'bg-indigo-500'
                                                    )} />
                                                    <div className="flex justify-between items-center mb-0.5">
                                                        <span className={cn(
                                                            "text-[8px] font-black uppercase tracking-widest",
                                                            notice.type === 'urgent' ? 'text-rose-600' :
                                                                notice.type === 'event' ? 'text-emerald-600' : 'text-indigo-600'
                                                        )}>{notice.type}</span>
                                                        <span className="text-[8px] text-slate-400 font-bold">{new Date(notice.date).toLocaleDateString()}</span>
                                                    </div>
                                                    <h4 className="text-xs font-bold text-slate-700 line-clamp-1 uppercase tracking-tight">
                                                        {notice.title}
                                                    </h4>
                                                </div>
                                            ))}
                                            {visibleNotices.length === 0 && (
                                                <p className="text-[11px] font-medium text-slate-400 py-2">Nenhum aviso no momento.</p>
                                            )}
                                        </div>
                                    </HabitaCard>

                                    {/* 3. RESERVAS E 4. RECIBOS (Separados e ordenados) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Próximas Reservas */}
                                        <HabitaCard variant="white" className="flex flex-col border-slate-200">
                                            <HabitaCardHeader>
                                                <HabitaCardTitle className="flex items-center gap-2">
                                                    <Calendar size={16} className="text-emerald-500" /> Próximas Reservas
                                                </HabitaCardTitle>
                                            </HabitaCardHeader>
                                            <div className="flex-1 space-y-4">
                                                {myNextReserva ? (
                                                    <div
                                                        className="bg-indigo-600 p-4 rounded-md text-white shadow-lg flex items-center justify-between cursor-pointer hover:bg-indigo-700 transition-colors"
                                                        onClick={() => navigate('/reservas')}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Calendar size={18} className="text-indigo-200" />
                                                            <div>
                                                                <p className="text-[8px] font-bold uppercase tracking-wider opacity-70">Sua Reserva</p>
                                                                <p className="text-[11px] font-bold">{myNextReserva.areaName}</p>
                                                                <p className="text-[9px] font-medium opacity-80">{new Date(myNextReserva.data + 'T12:00:00').toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={18} />
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-6 text-center">
                                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight mb-3">Nenhuma reserva agendada</p>
                                                        <HabitaButton
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => navigate('/reservas')}
                                                            className="text-[10px] font-black h-8"
                                                        >
                                                            NOVA RESERVA
                                                        </HabitaButton>
                                                    </div>
                                                )}

                                                {myPackages.length > 0 && (
                                                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-md flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => navigate('/access-control')}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-amber-500 text-white rounded-md flex items-center justify-center shadow-lg shadow-amber-200/50">
                                                                <Shield size={20} />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider leading-none mb-1">Portaria</p>
                                                                <p className="text-xs font-bold text-amber-900 leading-tight">
                                                                    {myPackages.length === 1
                                                                        ? 'Uma encomenda aguardando você.'
                                                                        : `Existem ${myPackages.length} encomendas.`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={16} className="text-amber-400" />
                                                    </div>
                                                )}
                                            </div>
                                        </HabitaCard>

                                        {/* Recibos */}
                                        <HabitaCard variant="slate" className="flex flex-col">
                                            <HabitaCardHeader>
                                                <HabitaCardTitle className="flex items-center gap-2">
                                                    <FileText size={16} className="text-indigo-500" /> {isBillPayer ? 'Últimos Recibos' : 'Documentos de Unidade'}
                                                </HabitaCardTitle>
                                            </HabitaCardHeader>
                                            <div className="flex-1 space-y-3">
                                                {!isBillPayer ? (
                                                    <div className="flex flex-col items-center justify-center py-6 text-center">
                                                        <Shield size={24} className="text-slate-300 mb-2 opacity-50" />
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Recibos Financeiros</p>
                                                        <p className="text-[9px] text-slate-400 mt-1 max-w-[150px]">Acesso restrito ao proprietário da unidade.</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {history.filter(h => {
                                                            const myUnitIds = myUnits.map(mu => String(mu.id).toLowerCase().trim());
                                                            const isMatch = (id1: string | undefined, id2: string) => {
                                                                if (!id1) return false;
                                                                const a = String(id1).toLowerCase().trim();
                                                                return a === id2 || a.endsWith(`_${id2}`) || a.endsWith(`-${id2}`) || id2.endsWith(`_${a}`) || id2.endsWith(`-${a}`);
                                                            };
                                                            return h.units.some((u: Unit) => myUnitIds.some(id => isMatch(u.id, id)));
                                                        }).slice(0, 4).map((record: HistoryRecord) => (
                                                            <div key={record.id} className="bg-white p-3 rounded-md border border-slate-200 flex items-center justify-between group hover:border-indigo-200 transition-all shadow-sm">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 bg-slate-50 rounded-md flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                                                                        <FileText size={16} />
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-slate-700 uppercase">Ref. {record.referenceMonth}</span>
                                                                </div>
                                                                <HabitaIconActionButton
                                                                    icon={<Download />}
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    tooltip="Baixar Recibo"
                                                                    className="text-slate-300 group-hover:text-indigo-600 border-none bg-transparent"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDownloadAction(record.referenceMonth);
                                                                    }}
                                                                />
                                                            </div>
                                                        ))}
                                                        {history.length === 0 && (
                                                            <p className="text-[11px] font-medium text-slate-400 py-2">Nenhum recibo gerado ainda.</p>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </HabitaCard>
                                    </div>

                                    {/* 5. SEU CONSUMO (Posição Final) */}
                                    <HabitaChartContainer
                                        title="Seu Consumo Histórico"
                                        className="bg-slate-50 border-slate-200"
                                        legend={[{ label: 'Consumo (m³)', color: '#6366f1' }]}
                                        extra={<Link to="/history" className="text-[10px] font-bold text-indigo-600 uppercase hover:underline">Ver Histórico Completo</Link>}
                                    >
                                        <div className="flex flex-col md:flex-row items-start md:items-end gap-6 md:gap-8">
                                            <div className="h-[220px] w-full min-w-0">
                                                <ResponsiveContainer width="100%" height={220} minWidth={0}>
                                                    <BarChart data={userChartData}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                        <XAxis
                                                            dataKey="name"
                                                            axisLine={false}
                                                            tickLine={false}
                                                            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                                            dy={10}
                                                        />
                                                        <YAxis
                                                            axisLine={false}
                                                            tickLine={false}
                                                            tick={{ fontSize: 10, fontWeight: 700, fill: '#cbd5e1' }}
                                                        />
                                                        <Tooltip
                                                            cursor={{ fill: '#f1f5f9' }}
                                                            contentStyle={{
                                                                borderRadius: '8px',
                                                                border: '1px solid #e2e8f0',
                                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                                                fontSize: '11px',
                                                                fontWeight: 'bold'
                                                            }}
                                                        />
                                                        <Bar dataKey="consumo" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={35} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="pb-2 md:text-right shrink-0">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Última Leitura</p>
                                                <span className="text-4xl font-bold text-slate-900 tracking-tighter">
                                                    {userChartData.length > 0 ? Number(userChartData[userChartData.length - 1].consumo).toFixed(2) : '0.00'}
                                                    <span className="text-lg text-slate-400 font-bold ml-1">m³</span>
                                                </span>
                                            </div>
                                        </div>
                                    </HabitaChartContainer>
                                </div>
                            ) : (
                                <HabitaCard variant="indigo" padding="lg" className="flex flex-col items-center text-center gap-4">
                                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                                        <Building2 className="text-indigo-200" size={32} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-white mb-1">Bem-vindo ao HabitarPleno!</h2>
                                        <p className="text-indigo-100 text-sm font-medium opacity-90">
                                            Sua conta ainda não está vinculada a uma unidade. Entre em contato com a administração do condomínio para concluir seu cadastro.
                                        </p>
                                    </div>
                                </HabitaCard>
                            )
                            )}

                            {(isAdmin || isAnyOperator) && (
                                <div className="flex flex-col gap-6">
                                    {/* Grade de Conteúdo Informativo - Ordenação Inteligente para Mobile */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                        {/* 1. Faturas em Aberto (Posição 1) */}
                                        <div className="order-1">
                                            <HabitaCard variant="white" padding="md" className="border-slate-200 shadow-none hover:shadow-md transition-shadow h-full">
                                                <div className="flex flex-col h-full justify-between">
                                                    <div>
                                                        <HabitaCardHeader className="p-0 border-none mb-4">
                                                            <HabitaCardTitle className="flex items-center gap-2">
                                                                <DollarSign size={16} className="text-emerald-500" /> Faturas em Aberto
                                                            </HabitaCardTitle>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Referência {activeRefMonth}</p>
                                                        </HabitaCardHeader>

                                                        <div className="space-y-4">
                                                            <div className="flex items-end justify-between">
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Total Pendente</p>
                                                                    <p className="text-2xl font-bold text-slate-800 tracking-tight mt-1">
                                                                        {stats.currentRefOpenValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                    </p>
                                                                </div>
                                                                <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                                                                    {stats.currentRefOpenUnits} Unidades
                                                                </div>
                                                            </div>

                                                            {!stats.hasCurrentRefFaturas && (
                                                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-3">
                                                                    <Info size={16} className="text-slate-400" />
                                                                    <p className="text-[11px] font-medium text-slate-500 leading-tight">
                                                                        O faturamento da referência {activeRefMonth} ainda não foi gerado.
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <HabitaButton
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full mt-6"
                                                        onClick={() => navigate('/history')}
                                                        icon={<ArrowRight size={14} />}
                                                    >
                                                        Gerenciar Faturamento
                                                    </HabitaButton>
                                                </div>
                                            </HabitaCard>
                                        </div>

                                        {/* 2. Mural de Avisos (Mobile: Posição 2 | Desktop: Oculto aqui, usa sidebar) */}
                                        <div className="order-2 lg:hidden">
                                            <HabitaCard variant="white" padding="md" className="border-slate-200 shadow-none">
                                                <HabitaCardHeader className="p-0 border-none mb-4">
                                                    <HabitaCardTitle className="flex items-center gap-2">
                                                        <Megaphone size={16} className="text-amber-500" /> Mural de Avisos
                                                    </HabitaCardTitle>
                                                    <button
                                                        onClick={() => navigate('/mural')}
                                                        className="text-[10px] font-black text-indigo-600 uppercase tracking-widest transition-colors flex items-center gap-1"
                                                    >
                                                        Ver Tudo <ArrowRight size={12} />
                                                    </button>
                                                </HabitaCardHeader>

                                                <div className="space-y-4">
                                                     {notices.slice(0, 3).map((notice: MuralNotice) => (
                                                        <div
                                                            key={notice.id}
                                                            onClick={() => setSelectedNotice(notice)}
                                                            className="relative pl-3 py-1 group cursor-pointer"
                                                        >
                                                            <div className={cn(
                                                                "absolute left-0 top-0 bottom-0 w-1 rounded-full",
                                                                notice.type === 'urgent' ? 'bg-rose-500' :
                                                                    notice.type === 'event' ? 'bg-emerald-500' : 'bg-indigo-500'
                                                            )} />
                                                            <div className="flex justify-between items-center mb-0.5">
                                                                <span className={cn(
                                                                    "text-[8px] font-black uppercase tracking-widest",
                                                                    notice.type === 'urgent' ? 'text-rose-600' :
                                                                        notice.type === 'event' ? 'text-emerald-600' : 'text-indigo-600'
                                                                )}>{notice.type}</span>
                                                            </div>
                                                            <h4 className="text-xs font-bold text-slate-700 line-clamp-1 uppercase tracking-tight">
                                                                {notice.title}
                                                            </h4>
                                                        </div>
                                                    ))}
                                                </div>
                                            </HabitaCard>
                                        </div>

                                        {/* 3. Últimas Ocorrências (Mobile: Posição 3 | Desktop: 2ª linha full width) */}
                                        <div className="order-3 lg:order-4 lg:col-span-2">
                                            <HabitaCard variant="white" padding="none" className="border-slate-200 shadow-none">
                                                <HabitaCardHeader className="px-5 pt-5 pb-3">
                                                    <HabitaCardTitle className="flex items-center gap-2">
                                                        <AlertTriangle size={16} className="text-amber-500" /> Últimas Ocorrências
                                                    </HabitaCardTitle>
                                                    {stats.pendentes > 0 && (
                                                        <HabitaBadge variant="warning" size="xs">
                                                            {stats.pendentes} Pendentes
                                                        </HabitaBadge>
                                                    )}
                                                </HabitaCardHeader>
                                                <HabitaTable
                                                    headers={['Título', 'Aberta em', 'Status']}
                                                     data={ocorrencias.slice(0, 3).map((oco: Ocorrencia) => ([
                                                        <span className="font-bold text-slate-700">{oco.title || oco.titulo}</span>,
                                                        <span className="text-slate-500 font-medium">{new Date(oco.dataAbertura).toLocaleDateString()}</span>,
                                                        <HabitaBadge variant={oco.status === 'Resolvida' ? 'success' : 'warning'} size="xs">{oco.status}</HabitaBadge>
                                                    ]))}
                                                />
                                            </HabitaCard>
                                        </div>

                                        {/* 4. Radar de Manutenção (Mobile: Posição 4 | Desktop: Oculto aqui, usa sidebar) */}
                                        <div className="order-4 lg:hidden">
                                            <HabitaCard variant="white" padding="md" className="border-slate-200 shadow-none">
                                                <HabitaCardHeader className="p-0 border-none mb-4">
                                                    <HabitaCardTitle className="flex items-center gap-2">
                                                        <Wrench size={16} className="text-indigo-600" /> Radar de Manutenção
                                                    </HabitaCardTitle>
                                                    {stats.vencidas > 0 && (
                                                        <HabitaBadge variant="error" size="xs">
                                                            {stats.vencidas} Vencidas
                                                        </HabitaBadge>
                                                    )}
                                                </HabitaCardHeader>
                                                <div className="divide-y divide-slate-50">
                                                     {manutencoesComStatus.slice(0, 4).map((m: Manutencao, i: number) => (
                                                        <div key={`${m.id}-${i}`} onClick={() => navigate('/manutencoes')} className="py-2.5 flex items-center justify-between group cursor-pointer hover:bg-slate-50/50 px-1 transition-colors rounded">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-indigo-400 shrink-0 transition-colors" />
                                                                <span className="text-[11px] font-bold text-slate-600 truncate group-hover:text-slate-900 transition-colors uppercase tracking-tight">{m.titulo}</span>
                                                            </div>
                                                            <HabitaBadge variant={new Date(m.proximaData) < new Date() ? 'error' : 'success'} size="xs" className="shrink-0 ml-4">
                                                                {new Date(m.proximaData).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                                                            </HabitaBadge>
                                                        </div>
                                                    ))}
                                                </div>
                                            </HabitaCard>
                                        </div>

                                        {/* 5. Status de Pagamento (Mobile: Posição 5 | Desktop: Posição 2) */}
                                        <div className="order-5 lg:order-2">
                                            <HabitaCard variant="white" padding="md" className="border-slate-200 shadow-none hover:shadow-md transition-shadow h-full">
                                                <HabitaCardHeader className="p-0 border-none mb-4">
                                                    <HabitaCardTitle className="flex items-center gap-2 text-slate-800 text-[11px] font-black uppercase tracking-widest">
                                                        <CheckCircle2 size={16} className="text-indigo-500" /> Status de Pagamento
                                                    </HabitaCardTitle>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Visão Global da Referência {activeRefMonth}</p>
                                                </HabitaCardHeader>

                                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                                    {stats.paidUnits === 0 && stats.overdueUnits === 0 && stats.upcomingUnits === 0 ? (
                                                        <div className="h-[140px] w-[140px] flex flex-col items-center justify-center text-center opacity-30 text-slate-400">
                                                            <CheckCircle2 size={32} strokeWidth={1} />
                                                            <p className="text-[9px] font-bold uppercase mt-2 tracking-widest">Sem Dados</p>
                                                        </div>
                                                    ) : (
                                                        <div className="h-[140px] w-[140px] shrink-0 min-w-0">
                                                            <ResponsiveContainer width={140} height={140} minWidth={0}>
                                                                <PieChart>
                                                                    <Pie
                                                                        data={[
                                                                            { name: 'Pago', value: stats.paidUnits || 0, color: '#10b981' },
                                                                            { name: 'A Vencer', value: stats.upcomingUnits || 0, color: '#f59e0b' },
                                                                            { name: 'Vencido', value: stats.overdueUnits || 0, color: '#ef4444' }
                                                                        ].filter(d => d.value > 0)}
                                                                        cx="50%"
                                                                        cy="50%"
                                                                        innerRadius={45}
                                                                        outerRadius={60}
                                                                        paddingAngle={5}
                                                                        dataKey="value"
                                                                    >
                                                                        {[
                                                                            { name: 'Pago', value: stats.paidUnits || 0, color: '#10b981' },
                                                                            { name: 'A Vencer', value: stats.upcomingUnits || 0, color: '#f59e0b' },
                                                                            { name: 'Vencido', value: stats.overdueUnits || 0, color: '#ef4444' }
                                                                        ].filter(d => d.value > 0).map((entry: { name: string; value: number; color: string }, index: number) => (
                                                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                                        ))}
                                                                    </Pie>
                                                                    <Tooltip
                                                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                                                                    />
                                                                </PieChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    )}

                                                    <div className="flex-1 space-y-3">
                                                        {[
                                                            { label: 'Pagos', count: stats.paidUnits, color: 'bg-emerald-500' },
                                                            { label: 'A Vencer', count: stats.upcomingUnits, color: 'bg-amber-500' },
                                                            { label: 'Vencidos', count: stats.overdueUnits, color: 'bg-rose-500' }
                                                        ].map((item: { label: string; count: number; color: string }, i: number) => (
                                                            <div key={i} className="flex items-center justify-between group cursor-default">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                                                                    <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-700 transition-colors uppercase tracking-tight">{item.label}</span>
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-800">{item.count}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </HabitaCard>
                                        </div>
                                    </div>

                                    {/* 5. Consumo Global (Posição Final) */}
                                    <HabitaChartContainer
                                        title="Consumo Global"
                                        subtitle={`Referência: ${activeRefMonth}`}
                                        className="border-slate-200 shadow-none hover:shadow-md transition-shadow order-10 lg:col-span-2"
                                        legend={[{ label: 'Consumo (m³)', color: '#6366f1' }]}
                                        extra={stats.pendingReadings > 0 && (
                                            <button
                                                onClick={() => {
                                                    setDetailsType('reading');
                                                    setIsDetailsModalOpen(true);
                                                }}
                                                className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-100 uppercase tracking-tight hover:bg-amber-100 transition-all flex items-center gap-2 group shadow-sm"
                                            >
                                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                                {stats.pendingReadings} Leituras Pendentes
                                                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                                            </button>
                                        )}
                                    >
                                        <div className="h-[300px] w-full min-w-0">
                                            <ResponsiveContainer width="100%" height={300} minWidth={0}>
                                                <BarChart data={chartData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#cbd5e1' }} />
                                                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                    <Bar dataKey="consumo" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </HabitaChartContainer>
                                </div>
                            )}
                        </div>

                        {/* COLUNA DIREITA: Sidebar (4/12) */}
                        <div className="col-span-12 lg:col-span-4 flex flex-col gap-10">
                            {/* Radar (Manutenções) */}
                            <HabitaCard variant="integrated" className="hidden lg:flex flex-col">
                                <HabitaCardHeader className="mb-4">
                                    <HabitaCardTitle className="flex items-center gap-2">
                                        <Wrench size={14} className="text-indigo-600" /> Radar de Manutenção
                                    </HabitaCardTitle>
                                </HabitaCardHeader>
                                <div className="divide-y divide-slate-50">
                                    {manutencoesComStatus.slice(0, 4).map((m: any, i: number) => (
                                        <div key={`${m.id}-${i}`} onClick={() => navigate('/manutencoes')} className="py-2.5 flex items-center justify-between group cursor-pointer hover:bg-slate-50/50 px-1 transition-colors rounded">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-indigo-400 shrink-0 transition-colors" />
                                                <span className="text-[11px] font-bold text-slate-600 truncate group-hover:text-slate-900 transition-colors uppercase tracking-tight">{m.titulo}</span>
                                                            </div>
                                                            <HabitaBadge variant={new Date(m.proximaData) < new Date() ? 'error' : 'success'} size="xs" className="shrink-0 ml-4">
                                                                {new Date(m.proximaData).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                                                            </HabitaBadge>
                                                        </div>
                                                    ))}
                                                </div>
                                            </HabitaCard>

                                            {/* Mural (Feed) */}
                                            <HabitaCard variant="integrated" className="flex-1 hidden lg:flex flex-col">
                                                <HabitaCardHeader className="mb-4">
                                                    <HabitaCardTitle className="flex items-center gap-2">
                                                        <Megaphone size={14} className="text-amber-500" /> Mural de Avisos
                                                    </HabitaCardTitle>
                                                    <button
                                                        onClick={() => navigate('/mural')}
                                                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest transition-colors flex items-center gap-1"
                                                    >
                                                        Ver Tudo <ArrowRight size={12} />
                                                    </button>
                                                </HabitaCardHeader>

                                                <div className="space-y-1">
                                                     {notices.slice(0, 5).map((notice: MuralNotice) => (
                                                        <div
                                                            key={notice.id}
                                                            onClick={() => setSelectedNotice(notice)}
                                                            className="relative pl-4 py-3 group cursor-pointer hover:bg-slate-50/50 transition-colors rounded"
                                                        >
                                                            <div className={cn(
                                                                "absolute left-0 top-3 bottom-3 w-0.5 rounded-full transition-all group-hover:w-1",
                                                                notice.type === 'urgent' ? 'bg-rose-500' :
                                                                    notice.type === 'event' ? 'bg-emerald-500' : 'bg-indigo-500'
                                                            )} />
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className={cn(
                                                                    "text-[8px] font-black uppercase tracking-widest",
                                                                    notice.type === 'urgent' ? 'text-rose-600' :
                                                                        notice.type === 'event' ? 'text-emerald-600' : 'text-indigo-600'
                                                                )}>{notice.type}</span>
                                                                <span className="text-[8px] text-slate-400 font-bold">{new Date(notice.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <h4 className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors line-clamp-1 uppercase tracking-tight">
                                                                {notice.title}
                                                            </h4>
                                                        </div>
                                                    ))}
                                                </div>

                                                {isAdmin && (
                                                    <HabitaButton
                                                        variant="ghost"
                                                        size="sm"
                                                        className="w-full mt-4 text-slate-400 hover:text-slate-600 border border-dashed border-slate-200"
                                                        onClick={() => navigate('/mural')}
                                                        icon={<Plus size={14} />}
                                                    >
                                                        Novo Aviso
                                                    </HabitaButton>
                                                )}
                                            </HabitaCard>
                                        </div>
                                    </div>
                                </div>


                            {/* Modal de Detalhes de Pendências */}
                            <HabitaModal
                                isOpen={isDetailsModalOpen}
                                onClose={() => setIsDetailsModalOpen(false)}
                                title={detailsType === 'reading' ? 'Pendências de Leituras' : 'Pendências de Pagamentos'}
                                size="lg"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <HabitaHeading
                                        level={4}
                                        subtitle={
                                            detailsType === 'reading'
                                                ? `Competência ${activeRefMonth}`
                                                : detailsType === 'payment_atrasado'
                                                    ? 'Vencidos há até 30 dias'
                                                    : 'Vencidos há mais de 30 dias'
                                        }
                                    >
                                        Listagem Detalhada
                                    </HabitaHeading>
                                    <HabitaBadge variant={detailsType === 'reading' ? 'warning' : 'error'} size="sm">
                                        {pendingUnitsList.length} Unidades
                                    </HabitaBadge>
                                </div>

                                <div className="max-h-[450px] overflow-y-auto custom-scrollbar -mr-1 pr-1">
                                    {pendingUnitsList.length > 0 ? (
                                        <HabitaTable
                                            headers={detailsType.startsWith('payment') ? ['Ref.', 'Unidade', 'Proprietário', 'Ação'] : ['Unidade', 'Proprietário', 'Ação']}
                                            data={pendingUnitsList.map((unit: Unit) => [
                                                ...(detailsType.startsWith('payment') ? [<HabitaBadge variant="indigo" size="xs">{unit.referenceMonth}</HabitaBadge>] : []),
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-slate-50 border border-slate-200 rounded flex items-center justify-center font-bold text-slate-800 text-xs">
                                                        {unit.id.split('-')[0]}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                                            {settings.unitTypes.find(t => t.id === unit.typeId)?.name || 'Unidade'}
                                                        </span>
                                                    </div>
                                                </div>,
                                                <span className="font-bold text-slate-700">{unit.ownerName}</span>,
                                                <div className="flex items-center gap-3">
                                                    {(unit.status === 'pago' || unit.paymentDate) ? (
                                                        <HabitaButton
                                                            onClick={async () => {
                                                                const unitRecord = unit;
                                                                // Tentar encontrar o record correspondente no histórico para taxas extras corretas
                                                                const targetRecord = history.find((h: HistoryRecord) => h.referenceMonth === (unit.referenceMonth || activeRefMonth));

                                                                await generateReceiptPDF({
                                                                    unit: unitRecord,
                                                                    settings,
                                                                    referenceMonth: unit.referenceMonth || activeRefMonth,
                                                                    historyRecord: targetRecord,
                                                                    type: (unitRecord.status === 'pago' || unitRecord.paymentDate) ? 'recibo' : 'fatura'
                                                                });
                                                            }}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-indigo-600 h-auto"
                                                            icon={<Download size={14} />}
                                                        >
                                                            Recibo
                                                        </HabitaButton>
                                                    ) : isAdmin && detailsType.startsWith('payment') && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex flex-col items-end mr-2">
                                                                <span className="text-xs font-bold text-rose-600">
                                                                    {formatCurrency(calcularEncargos(calculateRecordTotal(unit), unit.dueDate || '', settings).total)}
                                                                </span>
                                                                <HabitaTooltip
                                                                    content={
                                                                        <div className="w-48 space-y-1 font-sans">
                                                                            <div className="flex justify-between border-b border-white/10 pb-1 mb-1">
                                                                                <span className="opacity-60 uppercase font-bold text-[10px]">Encargos de Atraso</span>
                                                                            </div>
                                                                            <div className="flex justify-between text-[10px]">
                                                                                <span className="opacity-60">Valor Base:</span>
                                                                                <span>{formatCurrency(calculateRecordTotal(unit))}</span>
                                                                            </div>
                                                                            <div className="flex justify-between text-[10px]">
                                                                                <span className="opacity-60 text-rose-400">Multa:</span>
                                                                                <span className="text-rose-400">{formatCurrency(calcularEncargos(calculateRecordTotal(unit), unit.dueDate || '', settings).multa)}</span>
                                                                            </div>
                                                                            <div className="flex justify-between text-[10px]">
                                                                                <span className="opacity-60 text-rose-400">Juros:</span>
                                                                                <span className="text-rose-400">{formatCurrency(calcularEncargos(calculateRecordTotal(unit), unit.dueDate || '', settings).juros)}</span>
                                                                            </div>
                                                                            <div className="flex justify-between font-bold text-emerald-400 border-t border-white/10 pt-1 mt-1 text-[11px]">
                                                                                <span>TOTAL:</span>
                                                                                <span>{formatCurrency(calcularEncargos(calculateRecordTotal(unit), unit.dueDate || '', settings).total)}</span>
                                                                            </div>
                                                                        </div>
                                                                    }
                                                                >
                                                                    <div className="flex items-center gap-1 cursor-help">
                                                                        <span className="text-[9px] font-black text-slate-400 line-through">
                                                                            {formatCurrency(calculateRecordTotal(unit))}
                                                                        </span>
                                                                        <Info size={10} className="text-indigo-400" />
                                                                    </div>
                                                                </HabitaTooltip>
                                                            </div>
                                                            <HabitaButton
                                                                onClick={() => {
                                                                    const u = allUnits.find((bu: Unit) => bu.id === unit.id);
                                                                    if (!u) return;
                                                                    setSelectedUnitForPayment(u);
                                                                    setPaymentReferenceMonth(unit.referenceMonth || activeRefMonth);
                                                                }}
                                                                variant="primary"
                                                                size="sm"
                                                                icon={<Check size={14} />}
                                                            >
                                                                Confirmar
                                                            </HabitaButton>
                                                        </div>
                                                    )}
                                                    <div className={`w-2 h-2 rounded-full ${detailsType === 'reading' ? 'bg-amber-400' : ((unit.status === 'pago' || unit.paymentDate) ? 'bg-emerald-500' : 'bg-rose-500')}`} />
                                                </div>
                                            ])}
                                        />
                                    ) : (
                                        <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                                                <CheckCircle2 size={32} />
                                            </div>
                                            <HabitaHeading level={3} className="items-center text-center">Tudo em ordem!</HabitaHeading>
                                            <p className="text-slate-500 text-sm mt-1">Não há pendências registradas para esta categoria.</p>
                                        </div>
                                    )}
                                </div>
                            </HabitaModal>

                            {/* Modal de Apuração de Consumo (Existing) */}
                            <HabitaModal
                                isOpen={isCloseModalOpen}
                                onClose={() => setIsCloseModalOpen(false)}
                                title="Apuração de Consumo"
                                footer={
                                    <>
                                        <HabitaButton variant="outline" onClick={() => setIsCloseModalOpen(false)}>Cancelar</HabitaButton>
                                        <HabitaButton
                                            variant="primary"
                                            onClick={async () => {
                                                if (!activeRefMonth.match(/^\d{2}\/\d{4}$/)) {
                                                    showToast('Formato de mês inválido (use MM/AAAA)', 'warning');
                                                    return;
                                                }
                                                await closeMonth(activeRefMonth);

                                                allUnits.forEach((u: Unit) => {
                                                    sendNotification({
                                                        userId: u.id,
                                                        title: 'Boleto disponível',
                                                        message: `A fatura de ${activeRefMonth} já pode ser visualizada.`,
                                                        type: 'info',
                                                        link: '/'
                                                    });
                                                });

                                                setIsCloseModalOpen(false);
                                                showToast('Apuração finalizada com sucesso!', 'success');
                                            }}
                                        >
                                            Confirmar e Finalizar
                                        </HabitaButton>
                                    </>
                                }
                            >
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <p className="text-slate-500 font-medium text-sm">
                                        Deseja finalizar a apuração de consumo deste período? Os valores serão calculados e preparados para o faturamento.
                                    </p>
                                    <HabitaCard variant="slate" padding="md" className="border border-slate-200">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Período de Referência</label>
                                        <span className="text-3xl font-bold text-slate-800">{activeRefMonth}</span>
                                    </HabitaCard>
                                </div>
                            </HabitaModal>

                            {/* Modal de Iniciar Novo Mês (Premium) */}
                            <HabitaModal
                                isOpen={isStartModalOpen}
                                onClose={() => setIsStartModalOpen(false)}
                                title="Iniciar Apuração?"
                                footer={
                                    <>
                                        <HabitaButton variant="outline" onClick={() => setIsStartModalOpen(false)}>Cancelar</HabitaButton>
                                        <HabitaButton
                                            variant="primary"
                                            disabled={isInitializing}
                                            icon={isInitializing ? <HabitaSpinner size="xs" variant="white" /> : <Sparkles size={16} />}
                                            onClick={async () => {
                                                setIsInitializing(true);
                                                try {
                                                    await initNewMonth(pendingRef);
                                                    setActiveRefMonth(pendingRef);
                                                    setIsStartModalOpen(false);
                                                    showToast('Novo mês iniciado com sucesso!', 'success');
                                                } catch (err) {
                                                    showToast("Erro ao iniciar mês.", 'error');
                                                } finally {
                                                    setIsInitializing(false);
                                                }
                                            }}
                                        >
                                            Confirmar Início
                                        </HabitaButton>
                                    </>
                                }
                            >
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                                        <Sparkles size={32} />
                                    </div>
                                    <p className="text-slate-500 font-medium text-sm leading-relaxed">
                                        Você está abrindo a competência <strong className="text-slate-800 font-bold">{pendingRef}</strong>.
                                    </p>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                                        As leituras anteriores de todas as unidades serão importadas como ponto de partida.
                                    </p>
                                </div>
                            </HabitaModal>
                            {/* Modal de Confirmação de Pagamento (Admin Dash) */}
                            <HabitaModal
                                isOpen={isPaymentModalOpen}
                                onClose={() => setIsPaymentModalOpen(false)}
                                title="Confirmar Baixa"
                                footer={
                                    <HabitaButton
                                        variant="primary"
                                        size="lg"
                                        className="w-full"
                                        onClick={async () => {
                                            if (!selectedUnitForPayment?.id) return;
                                            // Find the correct history record to get the firebase ID
                                            const targetRecord = history.find(r => r.referenceMonth === paymentReferenceMonth);
                                            await confirmUnitPayment(targetRecord?.id || currentRecord?.id || null, selectedUnitForPayment.id, parseFloat(paymentAmount), paymentDate);
                                            setIsPaymentModalOpen(false);
                                            showToast('Pagamento confirmado com sucesso!', 'success');
                                        }}
                                    >
                                        Confirmar Recebimento
                                    </HabitaButton>
                                }
                            >
                                {selectedUnitForPayment && (
                                    <div className="space-y-6">
                                        <HabitaCard variant="slate" padding="md" className="border border-slate-200">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Unidade</span>
                                            <span className="text-lg font-bold text-slate-800">{selectedUnitForPayment.id} - {selectedUnitForPayment.ownerName}</span>
                                        </HabitaCard>

                                        <div className="grid grid-cols-1 gap-4">
                                            <HabitaInput
                                                label="Valor Recebido (R$)"
                                                type="number"
                                                step="0.01"
                                                value={paymentAmount}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentAmount(e.target.value)}
                                                className="text-lg font-bold"
                                            />
                                            <HabitaInput
                                                label="Data do Recebimento"
                                                type="date"
                                                value={paymentDate}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </HabitaModal>

                            {/* Modal de Pagamento PIX (Morador) */}
                            <HabitaModal
                                isOpen={isPixModalOpen}
                                onClose={() => {
                                    setIsPixModalOpen(false);
                                    setCopied(false);
                                }}
                                title="Pagar com PIX"
                                size="sm"
                            >
                                {selectedUnitForPix && selectedRecordForPix && (
                                    <div className="flex flex-col items-center gap-6 py-4">
                                        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 ring-1 ring-slate-100 ring-offset-4 ring-offset-slate-50">
                                            <QRCodeSVG
                                                value={generatePixPayload(
                                                    settings.pixKey || '',
                                                    calculateRecordTotal(selectedUnitForPix),
                                                    settings.condoName || 'HabitarPleno'
                                                )}
                                                size={200}
                                                level="H"
                                                includeMargin={false}
                                            />
                                        </div>

                                        <div className="text-center w-full">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor do Boleto</div>
                                            <div className="text-2xl font-black text-slate-800">
                                                {calculateRecordTotal(selectedUnitForPix).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </div>
                                            <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 inline-block px-2 py-0.5 rounded-full mt-1 uppercase tracking-tight">
                                                Competência {selectedRecordForPix.referenceMonth}
                                            </div>
                                        </div>

                                        <div className="w-full space-y-3">
                                            <HabitaButton
                                                onClick={() => {
                                                    const payload = generatePixPayload(
                                                        settings.pixKey || '',
                                                        calculateRecordTotal(selectedUnitForPix),
                                                        settings.condoName || 'HabitarPleno'
                                                    );
                                                    navigator.clipboard.writeText(payload);
                                                    setCopied(true);
                                                    setTimeout(() => setCopied(false), 2000);
                                                }}
                                                variant={copied ? "success" : "primary"}
                                                className="w-full h-11"
                                                icon={copied ? <Check size={18} /> : <FileText size={18} />}
                                            >
                                                {copied ? 'Copiado!' : 'PIX Copia e Cola'}
                                            </HabitaButton>
                                            <p className="text-[10px] text-slate-400 text-center font-bold px-4 leading-tight uppercase tracking-tight">
                                                Aponte a câmera do seu banco para o QR Code ou use o botão para copiar o código.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </HabitaModal>

                            {/* --- ONBOARDING WIZARD MODAL --- */}
                            {
                                isOnboardingOpen && (
                                    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 overflow-y-auto">
                                        <div className="bg-white rounded border border-slate-200 shadow-2xl w-full max-w-xl p-8 md:p-12 relative animate-in zoom-in-95 duration-300 my-auto">
                                            {/* Logout Escape */}
                                            <div className="absolute top-8 right-8">
                                                <button
                                                    onClick={() => setIsLogoutConfirmOpen(true)}
                                                    className="flex items-center gap-2 text-slate-400 hover:text-red-500 font-bold text-xs uppercase tracking-wider transition-colors"
                                                >
                                                    <LogOut size={16} />
                                                    Sair
                                                </button>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="flex gap-2 mb-10">
                                                 {[1, 2, 3, 4].map((step: number) => (
                                                    <div
                                                        key={step}
                                                        className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${wizardStep >= step ? 'bg-emerald-500' : 'bg-slate-100'}`}
                                                    />
                                                ))}
                                            </div>
                                            <HabitaModal
                                                isOpen={isLogoutConfirmOpen}
                                                onClose={() => setIsLogoutConfirmOpen(false)}
                                                title="Sair do Sistema"
                                                size="sm"
                                                footer={
                                                    <div className="flex gap-3 w-full">
                                                        <HabitaButton variant="outline" onClick={() => setIsLogoutConfirmOpen(false)} className="flex-1 h-11 text-[10px] uppercase font-black">Manter</HabitaButton>
                                                        <HabitaButton variant="danger" onClick={async () => {
                                                            await api.post('/auth/logout').catch(() => {});
                                                            authSignOut?.();
                                                            navigate('/login');
                                                        }} className="flex-1 h-11 text-[10px] uppercase font-black bg-rose-600 border-rose-600">Sair Agora</HabitaButton>
                                                    </div>
                                                }
                                            >
                                                <div className="flex flex-col items-center text-center py-4">
                                                    <div className="w-16 h-16 bg-rose-50 text-rose-500 border border-rose-100 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
                                                        <LogOut size={32} />
                                                    </div>
                                                    <p className="text-slate-600 font-medium">Deseja realmente sair do sistema? Suas configurações de onboarding atuais não serão salvas.</p>
                                                </div>
                                            </HabitaModal>

                                            {wizardStep === 1 && (
                                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                                    <div className="text-center mb-4">
                                                        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 flex items-center justify-center mx-auto mb-4">
                                                            <Building2 size={40} />
                                                        </div>
                                                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Identidade</h2>
                                                        <p className="text-slate-500 font-medium mt-2 text-lg">Vamos começar com o básico do seu condomínio.</p>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="relative group">
                                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-4 mb-2">Nome do Condomínio</label>
                                                            <input
                                                                type="text"
                                                                value={wizardData.condoName}
                                                                onChange={e => setWizardData({ ...wizardData, condoName: e.target.value })}
                                                                className="w-full px-4 h-10 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all text-slate-800 font-bold"
                                                                placeholder="HabitarPleno"
                                                            />
                                                        </div>
                                                        <div className="relative group">
                                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-4 mb-2">CNPJ (Opcional)</label>
                                                            <input
                                                                type="text"
                                                                value={wizardData.cnpj}
                                                                onChange={e => setWizardData({ ...wizardData, cnpj: e.target.value })}
                                                                className="w-full px-4 h-10 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all text-slate-800 font-medium"
                                                                placeholder="00.000.000/0000-00"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-4 mt-4">
                                                        <button
                                                            onClick={() => setIsOnboardingOpen(false)}
                                                            className="px-6 h-12 text-slate-400 font-bold hover:text-slate-600 transition-colors text-sm uppercase tracking-wider"
                                                        >
                                                            Configurar Depois
                                                        </button>
                                                        <button
                                                            onClick={handleWizardNext}
                                                            disabled={!wizardData.condoName}
                                                            className="flex-1 h-12 bg-slate-900 text-white rounded font-bold hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            Próximo Passo <ArrowRight size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {wizardStep === 2 && (
                                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                                    <div className="text-center mb-4">
                                                        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded flex items-center justify-center mx-auto mb-4">
                                                            <ArrowRightLeft size={40} />
                                                        </div>
                                                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Financeiro</h2>
                                                        <p className="text-slate-500 font-medium mt-2 text-lg">Configure os parâmetros de cobrança.</p>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="relative group">
                                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-4 mb-2">Preço do Gás (R$ por m³)</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={wizardData.gasPrice}
                                                                onChange={e => setWizardData({ ...wizardData, gasPrice: parseFloat(e.target.value) || 0 })}
                                                                className="w-full px-4 h-12 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all text-slate-800 font-bold text-2xl text-center"
                                                            />
                                                        </div>
                                                        <div className="relative group">
                                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-4 mb-2">Chave PIX para Recebimento</label>
                                                            <input
                                                                type="text"
                                                                value={wizardData.pixKey}
                                                                onChange={e => setWizardData({ ...wizardData, pixKey: e.target.value })}
                                                                className="w-full px-4 h-10 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all text-slate-800 font-medium"
                                                                placeholder="E-mail, CPF ou Aleatória"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-4 mt-4">
                                                        <button onClick={handleWizardPrev} className="px-8 h-12 text-slate-400 font-bold hover:text-slate-600 transition-colors">Voltar</button>
                                                        <button
                                                            onClick={handleWizardNext}
                                                            className="flex-1 h-12 bg-slate-900 text-white rounded font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            Próximo <ArrowRight size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {wizardStep === 3 && (
                                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                                    <div className="text-center mb-4">
                                                        <div className="w-20 h-20 bg-violet-50 text-violet-600 rounded flex items-center justify-center mx-auto mb-4">
                                                            <Sparkles size={40} />
                                                        </div>
                                                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Rubricas</h2>
                                                        <p className="text-slate-500 font-medium mt-2 text-lg">Defina a classificação e taxas das suas unidades.</p>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="relative group">
                                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-4 mb-2">Nome da Rubrica Principal</label>
                                                            <input
                                                                type="text"
                                                                value={wizardData.unitTypeName}
                                                                onChange={e => setWizardData({ ...wizardData, unitTypeName: e.target.value })}
                                                                className="w-full px-4 h-9 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all text-slate-800 font-bold"
                                                                placeholder="Ex: Apartamento Padrão"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="relative group">
                                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-4 mb-2">Cota Base (R$)</label>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={wizardData.unitTypeBase}
                                                                    onChange={e => setWizardData({ ...wizardData, unitTypeBase: parseFloat(e.target.value) || 0 })}
                                                                    className="w-full px-4 h-9 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all text-slate-800 font-bold"
                                                                    placeholder="0.00"
                                                                />
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-wider px-8">Você poderá criar mais rubricas e ajustar as taxas posteriormente nas Configurações.</p>
                                                    </div>
                                                    <div className="flex gap-4 mt-4">
                                                        <button onClick={handleWizardPrev} className="px-8 h-12 text-slate-400 font-bold hover:text-slate-600 transition-colors">Voltar</button>
                                                        <button
                                                            onClick={handleWizardNext}
                                                            disabled={!wizardData.unitTypeName}
                                                            className="flex-1 h-12 bg-slate-900 text-white rounded font-bold hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            Próximo <ArrowRight size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {wizardStep === 4 && (
                                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                                    <div className="text-center mb-4">
                                                        <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded flex items-center justify-center mx-auto mb-4">
                                                            <Building2 size={40} />
                                                        </div>
                                                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Cadastro de Unidades</h2>
                                                        <p className="text-slate-500 font-medium mt-2 text-lg">Como deseja criar as unidades do condomínio?</p>
                                                    </div>

                                                    {!importMode ? (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <button
                                                                onClick={() => setImportMode('excel')}
                                                                className="h-32 border-2 border-slate-200 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-emerald-500 hover:bg-emerald-50 transition-colors group"
                                                            >
                                                                <Download className="text-slate-400 group-hover:text-emerald-500" size={32} />
                                                                <span className="font-bold text-slate-600 group-hover:text-emerald-700 uppercase tracking-wider text-xs">Importar Via Planilha</span>
                                                            </button>
                                                            <button
                                                                onClick={() => setImportMode('manual')}
                                                                className="h-32 border-2 border-slate-200 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                                                            >
                                                                <Plus className="text-slate-400 group-hover:text-blue-500" size={32} />
                                                                <span className="font-bold text-slate-600 group-hover:text-blue-700 uppercase tracking-wider text-xs">Adicionar Manualmente</span>
                                                            </button>
                                                        </div>
                                                    ) : importMode === 'manual' ? (
                                                        <div className="relative group">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-4">Números das Unidades</label>
                                                                <button onClick={() => setImportMode(null)} className="text-[10px] text-blue-500 uppercase font-bold hover:underline mr-2">Trocar Modo</button>
                                                            </div>
                                                            <textarea
                                                                value={wizardData.unitsInput}
                                                                onChange={e => setWizardData({ ...wizardData, unitsInput: e.target.value })}
                                                                rows={4}
                                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all text-slate-800 font-medium text-lg leading-relaxed"
                                                                placeholder="Ex: 101, 102, 103, 104..."
                                                            />
                                                            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-wider px-8 mt-2">Criadas vinculadas à rubrica "{wizardData.unitTypeName}".</p>
                                                        </div>
                                                    ) : ( // importMode === 'excel'
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-4">Planilha Excel/CSV</label>
                                                                <button onClick={() => { setImportMode(null); setWizardFile(null); setWizardPreviewData([]); }} className="text-[10px] text-blue-500 uppercase font-bold hover:underline mr-2">Trocar Modo</button>
                                                            </div>

                                                            {wizardInvalidTypes.length > 0 && (
                                                                <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded flex items-start gap-3">
                                                                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                                                    <div>
                                                                        <p className="text-sm font-bold mb-1">Tipologias Inválidas!</p>
                                                                        <p className="text-xs font-medium mb-2">
                                                                            Os tipos da planilha devem corresponder ao que você cadastrou no Passo 3. Encontrados:
                                                                        </p>
                                                                        <ul className="list-disc list-inside text-xs font-bold font-mono">
                                                                            {wizardInvalidTypes.map(t => <li key={t}>{t}</li>)}
                                                                        </ul>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {!wizardFile ? (
                                                                <div
                                                                    className="border-2 border-dashed border-slate-300 rounded p-8 bg-slate-50 flex flex-col items-center justify-center text-center hover:bg-slate-100 transition-all cursor-pointer"
                                                                    onClick={() => fileWizardRef.current?.click()}
                                                                >
                                                                    <Download className="text-slate-400 mb-2" size={24} />
                                                                    <h3 className="text-sm font-bold text-slate-700">Arraste a planilha ou clique</h3>
                                                                    <input
                                                                        type="file"
                                                                        className="hidden"
                                                                        ref={fileWizardRef}
                                                                        accept=".xlsx, .xls, .csv"
                                                                        onChange={handleFileUploadWizard}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="border border-slate-200 rounded p-4 bg-slate-50 flex justify-between items-center">
                                                                    <div>
                                                                        <p className="text-sm font-bold text-slate-800">{wizardFile.name}</p>
                                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{wizardPreviewData.length} registros preparados</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Botões de Ação Unificados para Step 4 */}
                                                    <div className="space-y-4 pt-2">
                                                        <div className="flex gap-4">
                                                            <button onClick={handleWizardPrev} className="px-8 h-12 text-slate-400 font-bold hover:text-slate-600 transition-colors">Voltar</button>
                                                            <button
                                                                onClick={handleWizardComplete}
                                                                disabled={isInitializing || (importMode === 'manual' && !wizardData.unitsInput) || (importMode === 'excel' && (wizardPreviewData.length === 0 || wizardInvalidTypes.length > 0))}
                                                                className="flex-1 h-12 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                                            >
                                                                {isInitializing ? <HabitaSpinner size="md" variant="white" /> : (
                                                                    <>
                                                                        Concluir Configuração <Check size={24} />
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>

                                                        <div className="text-center pt-4 border-t border-slate-200">
                                                            <button
                                                                onClick={async () => {
                                                                    setIsInitializing(true);
                                                                    try {
                                                                        const generateId = () => {
                                                                            if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
                                                                            return Date.now().toString(36) + Math.random().toString(36).substring(2);
                                                                        };
                                                                        const newSettings = {
                                                                            ...settings,
                                                                            condoName: wizardData.condoName,
                                                                            cnpj: wizardData.cnpj,
                                                                            gasPrice: wizardData.gasPrice,
                                                                            pixKey: wizardData.pixKey,
                                                                            unitTypes: [
                                                                                {
                                                                                    id: generateId(),
                                                                                    name: wizardData.unitTypeName,
                                                                                    baseFee: wizardData.unitTypeBase || 0,
                                                                                }
                                                                            ]
                                                                        };
                                                                        await updateSettings(newSettings);
                                                                        setIsOnboardingOpen(false);
                                                                    } catch (err) {
                                                                        console.error("Erro ao pular cadastro de unidades:", err);
                                                                        showToast("Erro ao pular etapa.", "error");
                                                                    } finally {
                                                                        setIsInitializing(false);
                                                                    }
                                                                }}
                                                                className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hover:text-slate-600 underline"
                                                            >
                                                                Pular este passo e cadastrar unidades depois
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            }
            <HabitaModal
                isOpen={isBankDetailsModalOpen}
                onClose={() => setIsBankDetailsModalOpen(false)}
                title="Detalhamento de Contas"
            >
                <div className="space-y-4">
                    <p className="text-xs font-medium text-slate-500 mb-2">Visão consolidada de todas as contas bancárias ativas.</p>
                    <div className="grid grid-cols-1 gap-3">
                        {bankAccounts.filter((b: any) => b.status === 'ativa').map((bank: any) => (
                            <div key={bank.id} className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center justify-between group hover:bg-white hover:border-indigo-100 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                                        <Building2 size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{bank.name}</h4>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                            {bank.type === 'corrente' ? 'Conta Corrente' : bank.type === 'poupanca' ? 'Conta Poupança' : 'Investimento'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-slate-900 tracking-tight">
                                        {bank.currentBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </HabitaModal>

            {/* Modal de Exibição de Aviso do Mural */}
            <HabitaModal
                isOpen={!!selectedNotice}
                onClose={() => setSelectedNotice(null)}
                title={selectedNotice?.title || 'Aviso'}
                size="md"
                footer={
                    <div className="flex gap-3 w-full">
                        <HabitaButton 
                            variant="outline" 
                            onClick={() => setSelectedNotice(null)} 
                            className="flex-1"
                        >
                            Fechar
                        </HabitaButton>
                        {!isAdmin && (
                            <HabitaButton 
                                variant="primary" 
                                onClick={handleMarkAsRead}
                                className="flex-1"
                                icon={<Check size={16} />}
                            >
                                Marcar como Lido
                            </HabitaButton>
                        )}
                    </div>
                }
            >
                {selectedNotice && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <HabitaBadge 
                                variant={selectedNotice.type === 'urgent' ? 'error' : selectedNotice.type === 'event' ? 'success' : 'indigo'}
                                size="xs"
                            >
                                {selectedNotice.type === 'urgent' ? 'URGENTE' : selectedNotice.type === 'event' ? 'EVENTO' : 'AVISO'}
                            </HabitaBadge>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">
                                {new Date(selectedNotice.date).toLocaleDateString()}
                            </span>
                        </div>
                        
                        <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl">
                            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                                {selectedNotice.content}
                            </p>
                        </div>

                        {selectedNotice.authorName && (
                            <p className="text-[10px] text-slate-400 font-bold uppercase text-right">
                                Enviado por: {selectedNotice.authorName}
                            </p>
                        )}
                    </div>
                )}
            </HabitaModal>
            </HabitaCard>
        </div>
    );
};

export default DashboardPage;
