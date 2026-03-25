import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp, type HistoryRecord, type Unit } from '../contexts/AppContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { Save, ArrowLeft, Trash2, MessageCircle, Pencil, X, Check, FileSpreadsheet, Copy, Download, Calendar, FileText, Lock, RefreshCw, AlertTriangle, Search, Building, DollarSign } from 'lucide-react';
import { generatePixPayload } from '../utils/PixUtils.ts';
import { QRCodeSVG } from 'qrcode.react';
import { generateReceiptPDF } from '../utils/ReceiptGenerator.ts';
import { generateGasReport } from '../utils/PDFReportUtils.ts';
import { hasPermission } from '../utils/rbac.ts';
import { useToast } from '../contexts/ToastContext.ts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

import { HabitaCard } from '../components/ui/HabitaCard';
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaTable, HabitaTHead, HabitaTBody, HabitaTR, HabitaTH, HabitaTD } from '../components/ui/HabitaTable';
import { HabitaHeading } from '../components/ui/HabitaHeading';
import { HabitaInput } from '../components/ui/HabitaForm';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaDatePicker } from '../components/ui/HabitaDatePicker';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaIconActionButton } from '../components/ui/HabitaIconActionButton';
import { HabitaStatGrid } from '../components/ui/HabitaStatGrid';

const HistoryDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { visibleHistory: history, updateHistoryRecord, settings, isMonthClosed, extraFees } = useApp();
    const { isAdmin, profile, accessProfile } = useAuth();
    const { showToast } = useToast();

    const [record, setRecord] = useState<HistoryRecord | null>(null);
    const [loading, setLoading] = useState(true);

    const [isEditingDueDate, setIsEditingDueDate] = useState(false);
    const [tempDueDate, setTempDueDate] = useState('');

    const [isPixModalOpen, setIsPixModalOpen] = useState(false);
    const [selectedUnitForPix, setSelectedUnitForPix] = useState<Unit | null>(null);
    const [copied, setCopied] = useState(false);
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [unitToDelete, setUnitToDelete] = useState<string | null>(null);





    // Derive record from history - using useMemo instead of useState+useEffect to avoid setState-in-effect
    const initialRecord = useMemo(() => {
        const found = history.find(h => h.id === id);
        if (found) {
            const cloned = JSON.parse(JSON.stringify(found)) as HistoryRecord;
            if (cloned.units && !hasPermission(accessProfile, 'history', 'all')) {
                cloned.units = cloned.units.filter(u => u.id === profile?.unitId);
            }
            return cloned;
        }
        return null;
    }, [id, history, accessProfile, profile?.unitId]);

    useEffect(() => {
        if (initialRecord) {
            setRecord(initialRecord);
            setLoading(false);
        } else {
            navigate('/history');
        }
    }, [initialRecord, navigate]);

    if (loading || !record) return <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest">Carregando apuração...</div>;
    
    // Type-safe local reference for the linter
    const r = record as HistoryRecord;

    // Immutability: Check if the month is closed (has snapshot)
    const isClosed = isMonthClosed(r.referenceMonth);
    const canEdit = hasPermission(accessProfile, 'history', 'all') && !isClosed;

    const handleReadingChange = (unitId: string, val: number) => {
        if (isClosed) return; // Immutability guard
        setRecord(prev => {
            if (!prev) return null;
            return {
                ...prev,
                units: (prev.units || []).map(u => u.id === unitId ? { ...u, currentGasReading: val } : u)
            };
        });
    };

    const startEditingDueDate = () => {
        if (!record || isClosed) return; // Immutability guard
        const [d, m, y] = record.dueDate.split('/');
        setTempDueDate(`${y}-${m}-${d}`);
        setIsEditingDueDate(true);
    };

    const handleSaveHeader = () => {
        if (!record || !tempDueDate) return;
        const [y, m, d] = tempDueDate.split('-');
        const formattedDate = `${d}/${m}/${y}`;
        const updatedRecord = { ...record, dueDate: formattedDate };
        setRecord(updatedRecord);
        updateHistoryRecord(updatedRecord.id, updatedRecord);
        setIsEditingDueDate(false);
    };

    const handleExportReferenceCSV = () => {
        if (!record) return;
        const separator = ';';
        const BOM = '\uFEFF';
        let csvContent = BOM;

        const headers = ['Apartamento', 'Bloco', 'Medição Atual', 'Medição Anterior', 'Consumo', 'Valor do Gás', 'Taxa Condominial', 'Total', 'Nome do Morador'];
        csvContent += headers.join(separator) + '\n';

        const sortedUnits = [...(record.units || [])].sort((a, b) => {
            const blockA = a.block || '';
            const blockB = b.block || '';
            if (blockA !== blockB) return blockA.localeCompare(blockB);
            return a.id.localeCompare(b.id, undefined, { numeric: true });
        });

        sortedUnits.forEach(unit => {
            const { consumption, value } = calculateValues(unit);
            const type = (record.unitTypes || []).find(t => t.id === unit.typeId);
            const fixedFee = (type?.baseFee || 0);

            // Calcular taxas extras do snapshot
            const extraFeesTotal = (record.extraFees || []).reduce((sum, fee) => {
                const fv = fee.values.find(v => v.unitTypeId === unit.typeId)?.value || 0;
                return sum + fv;
            }, 0);

            const totalAmount = unit.calculatedTotal || (fixedFee + value + extraFeesTotal);
            const cleanUnitId = unit.block && unit.id.toUpperCase().endsWith(`-${unit.block.toUpperCase()}`)
                ? unit.id.slice(0, -(unit.block.length + 1))
                : unit.id;

            const row = [
                cleanUnitId,
                unit.block || '-',
                unit.currentGasReading.toString().replace('.', ','),
                unit.lastGasReading.toString().replace('.', ','),
                consumption.toFixed(2).replace('.', ','),
                value.toFixed(2).replace('.', ','),
                fixedFee.toFixed(2).replace('.', ','),
                totalAmount.toFixed(2).replace('.', ','),
                unit.ownerName || '-'
            ];
            csvContent += row.join(separator) + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const refName = record.referenceMonth.replace('/', '_');
        link.setAttribute('href', url);
        link.setAttribute('download', `leituras_unidades_REF_${refName}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSaveLine = (unit: Unit) => {
        if (!record || isClosed) return; // Immutability guard
        updateHistoryRecord(record.id, record);
        showToast(`Registro da unidade ${unit.id} atualizado!`, 'success');
    };

    const handleDeleteLine = (unitId: string) => {
        if (!record || isClosed) return;
        setUnitToDelete(unitId);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteUnit = () => {
        if (record && unitToDelete) {
            const updatedRecord = {
                ...record,
                units: (record.units || []).filter(u => u.id !== unitToDelete)
            };
            setRecord(updatedRecord);
            updateHistoryRecord(updatedRecord.id, updatedRecord);
            setIsDeleteModalOpen(false);
            setUnitToDelete(null);
            showToast(`Unidade ${unitToDelete} removida com sucesso.`, 'success');
        }
    };

    const calculateValues = (unit: Unit) => {
        const price = record.gasPrice;
        const consumption = Math.max(0, unit.currentGasReading - unit.lastGasReading);
        const value = consumption * price;
        return { consumption, value };
    };

    const handleSyncFees = () => {
        if (!record) return;
        const activeFees = extraFees.filter(f => f.status === 'active').map(fee => {
            if (fee.type === 'installment') {
                return {
                    ...fee,
                    currentInstallment: fee.currentInstallment || 1,
                    totalInstallments: fee.totalInstallments || 1
                };
            }
            return fee;
        });
        const updated = {
            ...record,
            gasPrice: settings.gasPrice,
            unitTypes: JSON.parse(JSON.stringify(settings.unitTypes)),
            extraFees: JSON.parse(JSON.stringify(activeFees))
        };
        setRecord(updated);
        updateHistoryRecord(updated.id, updated);
        showToast('Sincronizado com as configurações atuais!', 'success');
        setIsSyncModalOpen(false);
    };

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const generateWhatsAppText = (unit: Unit) => {
        if (!record) return;
        const { value } = calculateValues(unit);
        const type = (record.unitTypes || []).find(t => t.id === unit.typeId);
        const quota = (type?.baseFee || 0);
        
        // Listar taxas extras detalhadas
        const extraFeesLines = (record.extraFees || []).map(fee => {
            const feeValue = fee.values.find(v => v.unitTypeId === unit.typeId)?.value || 0;
            if (feeValue <= 0) return null;
            
            let name = fee.name;
            if (fee.type === 'installment' && fee.totalInstallments) {
                const current = (fee.currentInstallment || 1).toString().padStart(2, '0');
                const total = fee.totalInstallments.toString().padStart(2, '0');
                name = `${fee.name} (${current}/${total})`;
            }
            
            // Alinhamento visual aproximado com pontos
            const label = (name + '....................').slice(0, 24);
            return `${label} ${formatCurrency(feeValue).replace('R$', 'R$ ')}`;
        }).filter(Boolean).join('\n');

        const extraFeesTotal = (record.extraFees || []).reduce((sum, fee) => {
            const fv = fee.values.find(v => v.unitTypeId === unit.typeId)?.value || 0;
            return sum + fv;
        }, 0);
        const total = unit.calculatedTotal || (quota + value + extraFeesTotal);

        const text = `
Segue abaixo o valor do condomínio (Ref: ${record.referenceMonth}):
Apartamento ${unit.id}:
Vencimento........ ${record.dueDate || 'Data não salva'}
Cota.................... ${formatCurrency(quota).replace('R$', 'R$ ')}
${extraFeesLines}${extraFeesLines ? '\n' : ''}Gás..................... ${formatCurrency(value).replace('R$', 'R$ ')}
Total................... ${formatCurrency(total).replace('R$', 'R$ ')}`;

        navigator.clipboard.writeText(text);
        showToast('Texto copiado para a área de transferência!', 'success');
    };

    const handleDownloadReceipt = async (unit: Unit, type: 'fatura' | 'recibo' = 'recibo') => {
        if (!record) return;
        if (type === 'recibo' && !(unit.status === 'pago' || unit.paymentDate)) return;

        // Check for pending previous invoices
        const today = new Date();
        const hasPendingPrevious = history.some(h => {
            if (h.id === record.id) return false;
            const unitInHistory = (h.units || []).find(u => u.id === unit.id);
            if (!unitInHistory) return false;

            if (unitInHistory.status !== 'pago') {
                try {
                    const [d, m, y] = h.dueDate.split('/');
                    const dueDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                    return dueDate < today;
                } catch (e) { return false; }
            }
            return false;
        });

        await generateReceiptPDF({
            unit,
            settings,
            referenceMonth: record.referenceMonth,
            historyRecord: record,
            type,
            hasPendingPrevious
        });
    };

    return (
        <div className="w-full animate-in fade-in duration-500 pb-16">
            {/* Grand Card Branco - Interface Unificada */}
            <HabitaCard padding="none" allowOverflow className="bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[80vh] overflow-visible">
                
                {/* Header Integrado */}
                <div className="p-3 md:p-8 pb-8 bg-slate-50/20 border-b border-slate-100 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <HabitaButton
                                variant="outline"
                                onClick={() => navigate('/history')}
                                icon={<ArrowLeft size={20} />}
                                className="h-12 px-4 rounded-2xl bg-white border-slate-200 shadow-sm hover:bg-slate-50 shrink-0 text-slate-500 font-bold text-[10px] uppercase tracking-widest"
                            >
                                Voltar
                            </HabitaButton>
                            <div>
                                <HabitaHeading level={1} className="flex items-center gap-3 text-2xl md:text-3xl">
                                    Apuração: {r.referenceMonth}
                                </HabitaHeading>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                        <Calendar size={12} className="text-slate-300" /> Aberto em: {r.closedAt ? new Date(r.closedAt).toLocaleDateString() : '—'}
                                    </p>
                                    <div className="h-3 w-[1px] bg-slate-200 hidden md:block" />
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Vencimento:</span>
                                        {isEditingDueDate ? (
                                            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-indigo-100 shadow-inner">
                                                <input
                                                    type="date"
                                                    value={tempDueDate}
                                                    onChange={(e) => setTempDueDate(e.target.value)}
                                                    className="h-7 w-28 border-none text-[10px] text-slate-800 outline-none font-bold bg-transparent px-2"
                                                />
                                                <HabitaIconActionButton
                                                    icon={<Check />}
                                                    variant="success"
                                                    size="xs"
                                                    tooltip="Salvar"
                                                    onClick={handleSaveHeader}
                                                />
                                                <HabitaIconActionButton
                                                    icon={<X />}
                                                    variant="danger"
                                                    size="xs"
                                                    tooltip="Cancelar"
                                                    onClick={() => setIsEditingDueDate(false)}
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 group cursor-pointer" onClick={startEditingDueDate}>
                                                <span className="text-indigo-600 text-[11px] font-black uppercase">{r.dueDate}</span>
                                                {canEdit && (
                                                    <Pencil size={12} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {isAdmin && (
                                <HabitaButton
                                    onClick={() => generateGasReport(r.referenceMonth)}
                                    variant="outline"
                                    className="bg-white border-slate-200"
                                    icon={<Download size={18} />}
                                >
                                    Relatório de Consumo
                                </HabitaButton>
                            )}
                            <HabitaButton
                                onClick={() => setIsSyncModalOpen(true)}
                                variant="secondary"
                                className="bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
                                icon={<RefreshCw size={18} />}
                            >
                                Sincronizar
                            </HabitaButton>
                            <HabitaButton
                                onClick={handleExportReferenceCSV}
                                variant="outline"
                                className="bg-white"
                                icon={<FileSpreadsheet size={18} />}
                            >
                                Exportar CSV
                            </HabitaButton>
                        </div>
                    </div>
                </div>

                {/* Dashboard de Apuração */}
                <div className="mb-8">
                    <HabitaStatGrid 
                        title="Resumo da Apuração"
                        icon={<FileText />}
                        metrics={[
                            {
                                label: "UNIDADES",
                                value: (r.units || []).length,
                                icon: <Building />,
                                variant: "slate",
                                subtext: "Participantes"
                            },
                            {
                                label: "CONSUMO TOTAL",
                                value: `${(r.units || []).reduce((sum, u) => sum + calculateValues(u).consumption, 0).toFixed(2)} m³`,
                                icon: <RefreshCw />,
                                variant: "indigo",
                                subtext: "Gás Medido"
                            },
                            {
                                label: "FATURAMENTO",
                                value: formatCurrency((r.units || []).reduce((sum, u) => sum + (u.calculatedTotal || 0), 0)),
                                icon: <DollarSign />,
                                variant: "emerald",
                                subtext: "Valor Global"
                            },
                            {
                                label: "LIQUIDEZ",
                                value: `${Math.round(((r.units || []).filter(u => u.status === 'pago' || u.paymentDate).length / ((r.units || []).length || 1)) * 100)}%`,
                                icon: <Check />,
                                variant: "indigo",
                                subtext: `${(r.units || []).filter(u => u.status === 'pago' || u.paymentDate).length} Pagos`
                            }
                        ]}
                        cols={4}
                    />
                </div>

                {/* Immutability Banner */}
                {isClosed && (
                    <div className="px-6 mb-4 animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-xl">
                            <Lock size={18} className="text-blue-400" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Snapshot Ativo</p>
                                <p className="text-xs text-slate-400 font-medium">Mês consolidado e protegido. Edições desabilitadas para auditoria.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters and Actions Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed mb-4 mx-2 md:mx-8">
                    <div className="flex-1 max-w-md w-full relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors z-10" size={18} />
                        <HabitaInput
                            placeholder="Buscar por unidade, bloco ou morador..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 h-12 bg-white border-slate-200"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <HabitaBadge variant="neutral" className="h-10 px-4 bg-white border-slate-200 text-slate-500 text-[10px] font-black">
                            {(r.units || []).length} REGISTROS
                        </HabitaBadge>
                    </div>
                </div>



                <div className="p-2 md:p-8 pt-4 md:pt-6">
                    <HabitaTable 
                        responsive 
                        mobileVariant="list"
                        containerClassName="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white"
                    >
                        <HabitaTHead>
                            <HabitaTR>
                                <HabitaTH>Unidade/Bloco</HabitaTH>
                                <HabitaTH>Medição Atual</HabitaTH>
                                <HabitaTH>Data Pagamento</HabitaTH>
                                <HabitaTH align="right" className="hidden md:table-cell">Consumo</HabitaTH>
                                <HabitaTH align="right" className="hidden md:table-cell">Valor Gás</HabitaTH>
                                <HabitaTH align="right" className="hidden md:table-cell">Taxas</HabitaTH>
                                <HabitaTH align="right">Total</HabitaTH>
                                <HabitaTH align="right">Ações</HabitaTH>
                            </HabitaTR>
                        </HabitaTHead>
                        <HabitaTBody>
                            {([...(r.units || [])].filter(unit => {
                                if (!searchTerm) return true;
                                const s = searchTerm.toLowerCase();
                                return unit.id.toLowerCase().includes(s) || 
                                       (unit.ownerName || '').toLowerCase().includes(s) ||
                                       (unit.block || '').toLowerCase().includes(s);
                            }).sort((a, b) => {
                                const blockA = a.block || '';
                                const blockB = b.block || '';
                                if (blockA !== blockB) return blockA.localeCompare(blockB);
                                return a.id.localeCompare(b.id, undefined, { numeric: true });
                            })).map((unit) => {
                                const { consumption, value } = calculateValues(unit);
                                const type = (r.unitTypes || []).find(t => t.id === unit.typeId);
                                const fixedFee = (type?.baseFee || 0);
                                const extraFeesTotal = (r.extraFees || []).reduce((sum, fee) => {
                                    const fv = fee.values.find(v => v.unitTypeId === unit.typeId)?.value || 0;
                                    return sum + fv;
                                }, 0);
                                const total = unit.calculatedTotal || (fixedFee + value + extraFeesTotal);
                                const isLower = unit.currentGasReading < unit.lastGasReading;
                                const cleanUnitId = unit.block && unit.id.toUpperCase().endsWith(`-${unit.block.toUpperCase()}`)
                                    ? unit.id.slice(0, -(unit.block.length + 1))
                                    : unit.id;

                                return (
                                    <HabitaTR key={unit.id} className="hover:bg-slate-50/50">
                                        {/* Mobile Layout */}
                                        <HabitaTD className="md:hidden pt-4 pb-2">
                                            <div className="flex flex-col gap-4">
                                                {/* Topo: Unidade e Valor Total */}
                                                <div className="flex justify-between items-start">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-slate-700 text-sm leading-tight tracking-tight">{cleanUnitId} - {unit.block || '—'}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{unit.ownerName || '—'}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-bold text-slate-900">{formatCurrency(total)}</span>
                                                    </div>
                                                </div>

                                                {/* Meio: Medição e Data side-by-side */}
                                                <div className="flex gap-3">
                                                    <div className="flex-1">
                                                        <HabitaInput
                                                            label="Leitura"
                                                            type="number"
                                                            disabled={!canEdit}
                                                            value={unit.currentGasReading}
                                                            onChange={(e) => handleReadingChange(unit.id, parseFloat(e.target.value) || 0)}
                                                            className={cn(
                                                                "w-full text-sm font-normal h-9",
                                                                isLower && "border-rose-300 bg-rose-50 text-rose-700"
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <HabitaDatePicker
                                                            label="Pagamento"
                                                            disabled={!canEdit}
                                                            value={unit.paymentDate ? new Date(unit.paymentDate + 'T12:00:00') : undefined}
                                                            onChange={(date: Date) => {
                                                                if (isClosed) return;
                                                                const dateStr = date.toISOString().split('T')[0];
                                                                setRecord(prev => {
                                                                    if (!prev) return null;
                                                                    return {
                                                                        ...prev,
                                                                        units: (prev.units || []).map(u => u.id === unit.id ? {
                                                                            ...u,
                                                                            paymentDate: dateStr,
                                                                            status: 'pago',
                                                                            amountPaid: total
                                                                        } : u)
                                                                    };
                                                                });
                                                            }}
                                                            className={cn(
                                                                "w-full uppercase text-[10px] h-9 font-normal",
                                                                (unit.status === 'pago' || unit.paymentDate) ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "text-slate-600"
                                                            )}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Rodapé: Badges e Botões */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <HabitaBadge variant="indigo" size="xs">
                                                            {consumption.toFixed(2)}m³
                                                        </HabitaBadge>
                                                        {extraFeesTotal > 0 && (
                                                            <HabitaBadge variant="warning" size="xs">
                                                                Taxas
                                                            </HabitaBadge>
                                                        )}
                                                        {(unit.status === 'pago' || unit.paymentDate) && (
                                                            <HabitaBadge variant="success" size="xs">
                                                                PAGO
                                                            </HabitaBadge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <HabitaIconActionButton
                                                            icon={unit.paymentDate ? <Download /> : <FileText />}
                                                            variant="outline"
                                                            size="sm"
                                                            tooltip={unit.paymentDate ? "Baixar Recibo" : "Baixar Fatura"}
                                                            onClick={() => handleDownloadReceipt(unit, unit.paymentDate ? 'recibo' : 'fatura')}
                                                        />
                                                        {canEdit && (
                                                            <HabitaIconActionButton
                                                                icon={<Trash2 />}
                                                                variant="danger"
                                                                size="sm"
                                                                tooltip="Excluir"
                                                                onClick={() => handleDeleteLine(unit.id)}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </HabitaTD>

                                        {/* Desktop Layout */}
                                        <HabitaTD className="hidden md:table-cell">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 text-sm leading-tight">{cleanUnitId} - {unit.block || '—'}</span>
                                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">{unit.ownerName || '—'}</span>
                                            </div>
                                        </HabitaTD>
                                        <HabitaTD className="hidden md:table-cell">
                                            <div className="flex flex-col gap-1">
                                                <HabitaInput
                                                    type="number"
                                                    disabled={!canEdit}
                                                    value={unit.currentGasReading}
                                                    onChange={(e) => handleReadingChange(unit.id, parseFloat(e.target.value) || 0)}
                                                    className={cn(
                                                        "w-32 text-sm font-bold h-9",
                                                        isLower && "border-rose-300 bg-rose-50 text-rose-700"
                                                    )}
                                                />
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Ant: {unit.lastGasReading}</span>
                                            </div>
                                        </HabitaTD>
                                        <HabitaTD className="hidden md:table-cell">
                                            <HabitaDatePicker
                                                disabled={!canEdit}
                                                value={unit.paymentDate ? new Date(unit.paymentDate + 'T12:00:00') : undefined}
                                                onChange={(date: Date) => {
                                                    if (isClosed) return;
                                                    const dateStr = date.toISOString().split('T')[0];
                                                    setRecord(prev => {
                                                        if (!prev) return null;
                                                        return {
                                                            ...prev,
                                                            units: (prev.units || []).map(u => u.id === unit.id ? {
                                                                ...u,
                                                                paymentDate: dateStr,
                                                                status: 'pago',
                                                                amountPaid: total
                                                            } : u)
                                                        };
                                                    });
                                                }}
                                                className={cn(
                                                    "w-40 uppercase text-[11px] h-9 font-bold",
                                                    (unit.status === 'pago' || unit.paymentDate) ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "text-slate-600"
                                                )}
                                            />
                                        </HabitaTD>
                                        <HabitaTD align="right" className="hidden md:table-cell font-bold text-slate-700">
                                            {consumption.toFixed(2)} <span className="text-[10px] text-slate-400 uppercase font-black ml-1">m³</span>
                                        </HabitaTD>
                                        <HabitaTD align="right" className="hidden md:table-cell font-bold text-slate-700">
                                            {formatCurrency(value)}
                                        </HabitaTD>
                                        <HabitaTD align="right" className={cn("hidden md:table-cell font-bold", extraFeesTotal > 0 ? "text-amber-600" : "text-slate-400")}>
                                            {formatCurrency(extraFeesTotal)}
                                        </HabitaTD>
                                        <HabitaTD align="right" className="font-black text-slate-900 border-l border-slate-50 pl-4 bg-slate-50/10 hidden md:table-cell">
                                            {formatCurrency(total)}
                                        </HabitaTD>
                                        <HabitaTD align="right" className="hidden md:table-cell">
                                            <div className="flex items-center justify-end gap-1">
                                                <HabitaIconActionButton
                                                    icon={<MessageCircle />}
                                                    variant="outline"
                                                    size="sm"
                                                    tooltip="WhatsApp"
                                                    onClick={() => generateWhatsAppText(unit)}
                                                />
                                                {!unit.paymentDate ? (
                                                    <HabitaIconActionButton
                                                        icon={<FileText />}
                                                        variant="outline"
                                                        size="sm"
                                                        tooltip="Baixar Fatura"
                                                        onClick={() => handleDownloadReceipt(unit, 'fatura')}
                                                    />
                                                ) : (
                                                    <HabitaIconActionButton
                                                        icon={<Download />}
                                                        variant="outline"
                                                        size="sm"
                                                        tooltip="Baixar Recibo"
                                                        onClick={() => handleDownloadReceipt(unit, 'recibo')}
                                                    />
                                                )}
                                                {!unit.paymentDate && (
                                                    <HabitaIconActionButton
                                                        icon={<Copy />}
                                                        variant="ghost"
                                                        size="sm"
                                                        tooltip="PIX"
                                                        onClick={() => { setSelectedUnitForPix(unit); setIsPixModalOpen(true); }}
                                                    />
                                                )}
                                                {canEdit && (
                                                    <>
                                                        <HabitaIconActionButton
                                                            icon={<Save />}
                                                            variant="success"
                                                            size="sm"
                                                            tooltip="Salvar"
                                                            onClick={() => handleSaveLine(unit)}
                                                        />
                                                        <HabitaIconActionButton
                                                            icon={<Trash2 />}
                                                            variant="danger"
                                                            size="sm"
                                                            tooltip="Excluir"
                                                            onClick={() => handleDeleteLine(unit.id)}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        </HabitaTD>
                                    </HabitaTR>
                                );
                            })}
                        </HabitaTBody>
                    </HabitaTable>
                </div>
            </HabitaCard>

            {/* Modal PIX */}
            <HabitaModal
                isOpen={isPixModalOpen && !!selectedUnitForPix}
                onClose={() => { setIsPixModalOpen(false); setCopied(false); }}
                title="Pagamento via PIX"
                size="sm"
            >
                <div className="space-y-6">
                    <div className="text-center">
                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-4">
                            Código QR para transferência instantânea
                        </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center">
                        <div className="w-full flex justify-between items-center mb-6">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Referência</span>
                                <span className="text-sm font-black text-slate-800">{record.referenceMonth}</span>
                            </div>
                            <div className="text-right flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total a Pagar</span>
                                <span className="text-xl font-black text-emerald-600">
                                    {selectedUnitForPix && record && formatCurrency(selectedUnitForPix.calculatedTotal || 0)}
                                </span>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-inner mb-6 transition-transform hover:scale-105 duration-300">
                            {selectedUnitForPix && record && (
                                <QRCodeSVG
                                    value={generatePixPayload(
                                        settings.pixKey || '',
                                    selectedUnitForPix.calculatedTotal || 0,
                                        settings.pixBeneficiary || 'Condominio',
                                        'Brasil',
                                        `Cond ${r.referenceMonth} Unid ${selectedUnitForPix.id}`
                                    )}
                                    size={160}
                                    level="H"
                                />
                            )}
                        </div>

                        <div className="w-full space-y-3">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Código Copia e Cola</label>
                            <div className="relative">
                                {selectedUnitForPix && (
                                    <textarea
                                        readOnly
                                        value={generatePixPayload(
                                            settings.pixKey || '',
                                            selectedUnitForPix.calculatedTotal || 0,
                                            settings.pixBeneficiary || 'Condominio',
                                            'Brasil',
                                            `Cond ${record.referenceMonth} Unid ${selectedUnitForPix.id}`
                                        )}
                                        className="w-full bg-white border border-slate-200 rounded-lg p-3 text-[10px] font-mono text-slate-600 break-all h-20 focus:outline-none resize-none"
                                    />
                                )}
                            </div>

                            <HabitaButton
                                onClick={async () => {
                                    if (!record || !selectedUnitForPix) return;
                                    const payload = generatePixPayload(
                                        settings.pixKey || '',
                                        selectedUnitForPix.calculatedTotal || 0,
                                        settings.pixBeneficiary || 'Condominio',
                                        'Brasil',
                                        `Cond ${record.referenceMonth} Unid ${selectedUnitForPix.id}`
                                    );

                                    try {
                                        await navigator.clipboard.writeText(payload);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    } catch (err) {
                                        console.error('Falha ao copiar:', err);
                                    }
                                }}
                                className={cn(
                                    "w-full h-12",
                                    copied ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-slate-900 text-white"
                                )}
                                icon={copied ? <Check size={18} /> : <Copy size={16} />}
                            >
                                {copied ? 'Copiado!' : 'Copiar Código'}
                            </HabitaButton>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3">
                        <MessageCircle size={20} className="text-amber-500 shrink-0" />
                        <p className="text-[10px] text-amber-800 font-bold leading-tight uppercase tracking-tight">
                            <strong>Dica HabitaPleno:</strong> Após o pagamento, envie o comprovante pelo WhatsApp do condomínio para dar baixa no sistema.
                        </p>
                    </div>
                </div>
            </HabitaModal>

            {/* Modal Sincronizar Taxas */}
            <HabitaModal
                isOpen={isSyncModalOpen}
                onClose={() => setIsSyncModalOpen(false)}
                title="Sincronizar Dados Atualizados?"
                size="sm"
            >
                <div className="p-4 text-center">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-100 ring-8 ring-blue-50/50">
                        <RefreshCw size={32} className="animate-spin-slow" />
                    </div>
                    
                    <p className="text-slate-600 text-sm font-medium leading-relaxed mb-8">
                        Esta ação irá atualizar as <strong>Taxas Extras</strong>, <strong>Cota Condominial</strong> e o <strong>Preço do Gás</strong> deste mês com os valores configurados atualmente no sistema.
                    </p>

                    <div className="space-y-3">
                        <HabitaButton
                            onClick={handleSyncFees}
                            variant="primary"
                            className="w-full h-12"
                        >
                            Confirmar Sincronização
                        </HabitaButton>
                        <HabitaButton
                            onClick={() => setIsSyncModalOpen(false)}
                            variant="ghost"
                            className="w-full h-12"
                        >
                            Cancelar
                        </HabitaButton>
                    </div>

                    <div className="mt-8 bg-amber-50 px-4 py-3 rounded-lg border border-amber-100 flex items-center gap-3">
                        <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                        <p className="text-[10px] text-amber-800 font-bold uppercase leading-tight text-left">
                            Nota: Isso substituirá os valores que foram capturados na abertura deste mês.
                        </p>
                    </div>
                </div>
            </HabitaModal>
            <HabitaModal
                isOpen={isDeleteModalOpen}
                onClose={() => { setIsDeleteModalOpen(false); setUnitToDelete(null); }}
                title="Remover Unidade?"
                size="sm"
                footer={
                    <div className="flex gap-3 w-full sm:w-auto">
                        <HabitaButton variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                            Manter Unidade
                        </HabitaButton>
                        <HabitaButton 
                            variant="danger" 
                            onClick={confirmDeleteUnit}
                            icon={<Trash2 size={16} />}
                        >
                            Confirmar Remoção
                        </HabitaButton>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-rose-100">
                        <Trash2 size={32} />
                    </div>
                    <HabitaHeading level={3} className="text-slate-800 mb-2">Ação Irreversível</HabitaHeading>
                    <p className="text-slate-500 text-xs leading-relaxed">
                        Deseja realmente remover a unidade <span className="font-black text-slate-700">{unitToDelete}</span> desta apuração? Isso excluirá permanentemente os lançamentos vinculados a ela neste período.
                    </p>
                </div>
            </HabitaModal>
        </div>
    );
};

export default HistoryDetailsPage;
