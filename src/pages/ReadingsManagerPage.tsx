import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNotifications } from '../contexts/NotificationContext';
import { HabitaModal } from '../components/ui/HabitaModal';
import { Save, Trash2, AlertTriangle, RefreshCw, Flame, Lock, Building2 } from 'lucide-react';
import { hasPermission } from '../utils/rbac';

// UI Components
import { HabitaCard, HabitaCardHeader } from '../components/ui/HabitaCard';
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaTable } from '../components/ui/HabitaTable';
import { HabitaInput } from '../components/ui/HabitaForm';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaHeading } from '../components/ui/HabitaHeading';
import { HabitaCombobox, type HabitaOption } from '../components/ui/HabitaCombobox';
import { HabitaStatGrid } from '../components/ui/HabitaStatGrid';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function ReadingsManagerPage() {
    const { visibleUnits: units, visibleHistory: history, settings, saveHistoryRecord, deleteHistoryRecord, isMonthClosed, periodStatus, gasTrends } = useApp();
    const { accessProfile, isAdmin } = useAuth();
    const canManageGas = hasPermission(accessProfile, 'gas', 'all');
    const canViewGas = hasPermission(accessProfile, 'gas', 'own') || canManageGas;

    // UI State
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        const m = (now.getMonth() + 1).toString().padStart(2, '0');
        const y = now.getFullYear();
        return `${m}/${y}`;
    });
    const [statusMessage, setStatusMessage] = useState('');

    // Working Data
    const [readings, setReadings] = useState<{ [unitId: string]: number }>({});
    const [isExistingRecord, setIsExistingRecord] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [existingRecordId, setExistingRecordId] = useState<string | null>(null);
    const [needsConfirmation, setNeedsConfirmation] = useState(false);
    const isClosed = isMonthClosed(selectedMonth);

    const { showToast } = useToast();
    const { sendNotification } = useNotifications();

    // Modal states
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Month Selector Options
    const monthOptions = useMemo<HabitaOption[]>(() => {
        let nextMStr = '';
        if (history.length > 0) {
            const last = history[0];
            const [m, y] = last.referenceMonth.split('/').map(Number);
            let nM = m + 1;
            let nY = y;
            if (nM > 12) { nM = 1; nY++; }
            nextMStr = `${nM.toString().padStart(2, '0')}/${nY}`;
        } else {
            const now = new Date();
            nextMStr = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
        }

        const options: HabitaOption[] = [
            { value: nextMStr, label: `${nextMStr} (Abrir Novo)` }
        ];

        history.forEach(h => {
            if (h.referenceMonth !== nextMStr) {
                options.push({ value: h.referenceMonth, label: h.referenceMonth });
            }
        });

        // Add selectedMonth if not present (edge case)
        if (!options.find(o => o.value === selectedMonth)) {
            options.push({ value: selectedMonth, label: selectedMonth });
        }

        return options;
    }, [history, selectedMonth]);

    // Summary Calculations
    const totalConsumption = useMemo(() => {
        let total = 0;
        const activeRecord = history.find(h => h.id === existingRecordId || h.referenceMonth === selectedMonth);
        units.forEach(unit => {
            const current = readings[unit.id] || 0;
            const prev = getPreviousReading(unit.id, activeRecord);
            total += Math.max(0, current - prev);
        });
        return total;
    }, [readings, units, history, selectedMonth, existingRecordId]);

    function getPreviousReading(unitId: string, currentMonthRecord?: any): number {
        // Se já houver histórico carregado para o mês atual, essa função não é chamada na renderização básica,
        // mas é útil para novos períodos. Usamos o registro do servidor.
        if (currentMonthRecord) {
            const u = currentMonthRecord.units?.find((idx: any) => idx.id === unitId);
            if (u && (u.lastGasReading || 0) > 0) return u.lastGasReading;
        }
        return gasTrends.lastReadings[unitId] || 0;
    }

    const getAverageConsumption = (unitId: string): number | null => {
        return gasTrends.unitAverages[unitId] || null;
    };

    // Load Data when Month Changes
    useEffect(() => {
        if (!selectedMonth || !selectedMonth.match(/^\d{2}\/\d{4}$/)) return;
        const record = history.find(h => h.referenceMonth === selectedMonth);

        if (record) {
            setIsExistingRecord(true);
            setExistingRecordId(record.id);
            setIsUnlocked(false);
            setStatusMessage(periodStatus[selectedMonth] || 'REGISTRO SALVO');
            const loadedData: { [key: string]: number } = {};
            record.units?.forEach(u => loadedData[u.id] = u.currentGasReading);
            setReadings(loadedData);
        } else {
            setIsExistingRecord(false);
            setExistingRecordId(null);
            setIsUnlocked(true);
            setStatusMessage(periodStatus[selectedMonth] || 'NOVO PERÍODO');
            const liveReadings: { [key: string]: number } = {};
            units.forEach(u => {
                if (u.currentGasReading > u.lastGasReading) liveReadings[u.id] = u.currentGasReading;
            });
            setReadings(liveReadings);
        }
        setNeedsConfirmation(false);
    }, [selectedMonth, history, periodStatus, units]);

    const handleSave = () => {
        let hasDiscrepancy = false;
        units.forEach(unit => {
            const current = readings[unit.id] || 0;
            const prev = getPreviousReading(unit.id);
            const cons = Math.max(0, current - prev);
            const avg = getAverageConsumption(unit.id);
            if (avg !== null && cons > (avg * 1.4) && cons > 1) hasDiscrepancy = true;
        });

        if (hasDiscrepancy && !needsConfirmation) {
            setNeedsConfirmation(true);
            showToast('Consumo elevado em algumas unidades. Verifique os dados.', 'warning');
            return;
        }

        setShowSaveConfirm(true);
    };

    const performSave = () => {
        setShowSaveConfirm(false);
        const historyRecord = history.find(h => h.id === existingRecordId);
        const snapshotUnits = units.map(baseUnit => {
            const currentGasReading = readings[baseUnit.id] || 0;
            const historyUnit = historyRecord?.units?.find(u => u.id === baseUnit.id);
            const lastGasReading = (isExistingRecord && historyUnit && (historyUnit.lastGasReading || 0) > 0)
                ? historyUnit.lastGasReading
                : getPreviousReading(baseUnit.id);
            return { ...baseUnit, currentGasReading, lastGasReading };
        });

        const existingRec = history.find(h => h.id === existingRecordId);
        const gasPriceToUse = existingRec ? existingRec.gasPrice : settings.gasPrice;
        const [m, y] = selectedMonth.split('/').map(Number);
        let [nM, nY] = [m + 1, y]; if (nM > 12) { nM = 1; nY++; }
        const autoDueDate = `${settings.dueDay.toString().padStart(2, '0')}/${nM.toString().padStart(2, '0')}/${nY}`;

        saveHistoryRecord({
            id: existingRecordId || crypto.randomUUID(),
            referenceMonth: selectedMonth,
            closedAt: existingRec ? existingRec.closedAt : new Date().toISOString(),
            gasPrice: gasPriceToUse,
            dueDate: existingRec ? existingRec.dueDate : autoDueDate,
            units: snapshotUnits,
            unitTypes: settings.unitTypes
        });

        setNeedsConfirmation(false);
        if (isExistingRecord) setIsUnlocked(false);
        if (!isExistingRecord) {
            snapshotUnits.forEach(unit => {
                sendNotification({
                    userId: unit.id,
                    title: 'Boleto disponível',
                    message: `A fatura de ${selectedMonth} já pode ser visualizada.`,
                    type: 'info',
                    link: '/'
                });
            });
        }
        showToast('Apuração finalizada com sucesso!', 'success');
    };

    const handleDelete = () => {
        if (!existingRecordId) return;
        setShowDeleteConfirm(true);
    };

    const performDelete = () => {
        if (!existingRecordId) return;
        deleteHistoryRecord(existingRecordId);
        setReadings({});
        setIsExistingRecord(false);
        setExistingRecordId(null);
        showToast('Registro excluído.', 'info');
        setShowDeleteConfirm(false);
    };

    if (!canViewGas) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <HabitaCard variant="outline" className="max-w-md text-center p-12">
                    <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={40} />
                    </div>
                    <HabitaHeading level={2}>Acesso Restrito</HabitaHeading>
                    <p className="text-slate-500 mt-4 font-medium leading-relaxed">
                        Esta é uma ferramenta administrativa. Entre em contato com o suporte caso precise de acesso.
                    </p>
                </HabitaCard>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-0 md:p-6 animate-in fade-in duration-500">
            <HabitaCard variant="white" padding="lg" className="max-w-[1400px] mx-auto min-h-[calc(100vh-120px)] flex flex-col rounded-none md:rounded-xl border-x-0 md:border-x">
                <HabitaCardHeader className="flex-col md:flex-row items-center justify-between gap-6 mb-8 border-b-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 border border-amber-100">
                            <Flame size={28} />
                        </div>
                        <HabitaHeading level={2} subtitle="Consolidação de Leituras de Gás">
                            Apuração de Consumo - Gás
                        </HabitaHeading>
                    </div>

                    <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 w-full md:w-auto">
                        <div className="w-full sm:w-48">
                            <HabitaCombobox
                                label="Competência"
                                options={monthOptions}
                                value={selectedMonth}
                                onChange={setSelectedMonth}
                                placeholder="Selecione o Mês"
                            />
                        </div>
                        
                        <div className="w-full sm:w-40">
                            <HabitaCombobox
                                label="Tipo Consumo"
                                options={[{ value: 'gas', label: 'Gás Natural' }, { value: 'water', label: 'Água (Coming Soon)', disabled: true }]}
                                value="gas"
                                placeholder="Tipo"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto sm:h-[58px] sm:items-end">
                            {isAdmin && !isClosed && (
                                <div className="flex flex-wrap gap-2 w-full">
                                    {isExistingRecord && !isUnlocked && (
                                        <HabitaButton
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsUnlocked(true)}
                                            icon={<RefreshCw size={14} />}
                                            className="flex-1 sm:flex-none"
                                        >
                                            Reabrir
                                        </HabitaButton>
                                    )}
                                    {isExistingRecord && (
                                        <HabitaButton
                                            variant="ghost"
                                            size="sm"
                                            className="text-rose-600 hover:bg-rose-50 flex-1 sm:flex-none"
                                            onClick={handleDelete}
                                            icon={<Trash2 size={14} />}
                                        >
                                            Apagar
                                        </HabitaButton>
                                    )}
                                    {((isExistingRecord && isUnlocked) || !isExistingRecord) && (
                                        <HabitaButton
                                            variant="primary"
                                            size="sm"
                                            onClick={handleSave}
                                            className={cn("flex-1 sm:flex-none", needsConfirmation ? 'animate-pulse bg-amber-600' : '')}
                                            icon={<Save size={14} />}
                                        >
                                            {needsConfirmation ? 'Confirmar' : 'Salvar Apuração'}
                                        </HabitaButton>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </HabitaCardHeader>

                {/* Stat Grid Row */}
                <div className="mb-8">
                    <HabitaStatGrid
                        title="Indicadores de Apuração"
                        icon={<Flame className="text-amber-500" />}
                        metrics={[
                            {
                                label: "CONSUMO TOTAL",
                                value: `${totalConsumption.toFixed(3)} m³`,
                                icon: <Flame />,
                                variant: "amber",
                                subtext: "Acumulado no Mês"
                            },
                            {
                                label: "UNIDADES LANÇADAS",
                                value: `${Object.keys(readings).length} / ${units.length}`,
                                icon: <Building2 />,
                                variant: "slate",
                                subtext: "Progresso de Coleta"
                            },
                            {
                                label: "STATUS DA COMPETÊNCIA",
                                value: statusMessage,
                                icon: isClosed ? <Lock /> : <RefreshCw />,
                                variant: isClosed ? 'indigo' : isExistingRecord ? 'emerald' : 'amber',
                                subtext: isClosed ? "Registro Blindado" : "Aguardando Finalização"
                            }
                        ]}
                        cols={3}
                    />
                </div>

                <div className="flex-1 overflow-hidden">
                    <HabitaTable
                        responsive
                        headers={['Unidade', 'Status', 'Anterior', 'Leitura Final', 'Consumo (m³)', 'Valor']}
                        data={units.sort((a, b) => {
                            if ((a.block || '') !== (b.block || '')) return (a.block || '').localeCompare(b.block || '');
                            return a.id.localeCompare(b.id, undefined, { numeric: true });
                        }).map(unit => {
                            const activeRecord = history.find(h => h.id === existingRecordId || h.referenceMonth === selectedMonth);
                            const prev = getPreviousReading(unit.id, activeRecord);
                            const current = readings[unit.id] ?? 0;
                            const consumption = Math.max(0, current - prev);
                            const avg = getAverageConsumption(unit.id);
                            const isHigh = avg !== null && consumption > (avg * 1.4) && consumption > 1;
                            const gasPrice = activeRecord?.gasPrice || settings.gasPrice || 0;

                            return [
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-slate-50 border border-slate-200 rounded flex items-center justify-center font-bold text-slate-800 text-xs">
                                        {unit.id.split('-')[0]}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-900 line-clamp-1">{unit.ownerName}</span>
                                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">
                                            {settings.unitTypes.find((t: any) => t.id === unit.typeId)?.name || 'Unidade'}
                                        </span>
                                    </div>
                                </div>,
                                <div className="flex items-center gap-2">
                                    {current > 0 ? (
                                        isHigh ? (
                                            <HabitaBadge variant="error" size="xs">Anomalia</HabitaBadge>
                                        ) : (
                                            <HabitaBadge variant="success" size="xs">Lançado</HabitaBadge>
                                        )
                                    ) : (
                                        <HabitaBadge variant="neutral" size="xs">Pendente</HabitaBadge>
                                    )}
                                </div>,
                                <span className="text-slate-400 font-mono font-medium">{prev.toFixed(3)}</span>,
                                <div className="flex flex-col gap-1 w-32">
                                    <HabitaInput
                                        type="number"
                                        step="0.001"
                                        disabled={!isUnlocked || !canManageGas}
                                        value={readings[unit.id] ?? ''}
                                        onChange={(e: any) => setReadings(p => ({ ...p, [unit.id]: parseFloat(e.target.value) || 0 }))}
                                        placeholder="0.000"
                                        className="h-8 text-right font-bold text-slate-900"
                                    />
                                    {isHigh && (
                                        <HabitaBadge variant="warning" size="xs" className="w-fit self-end">
                                            +40% da Média
                                        </HabitaBadge>
                                    )}
                                </div>,
                                <div className="flex flex-col items-end">
                                    <span className={consumption > 0 ? "font-black text-slate-800" : "text-slate-400 font-medium"}>
                                        {consumption.toFixed(3)}
                                    </span>
                                    {avg !== null && <span className="text-[8px] text-slate-500 font-medium uppercase tracking-wider">Média: {avg.toFixed(3)}</span>}
                                </div>,
                                <div className="flex flex-col items-end">
                                    <span className={consumption > 0 ? "font-black text-emerald-700" : "text-slate-400 font-medium"}>
                                        {(consumption * gasPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                    <span className="text-[8px] text-slate-500 font-medium uppercase tracking-wider">R$ {(gasPrice || 0).toFixed(2)}/m³</span>
                                </div>
                            ];
                        })}
                    />
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-center gap-6">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <div className="w-2 h-2 rounded-full bg-slate-300" />
                        <span>Cálculo Automático</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span>Detecção de Anomalias</span>
                    </div>
                </div>
            </HabitaCard>

            <HabitaModal
                isOpen={showSaveConfirm}
                onClose={() => setShowSaveConfirm(false)}
                title={`Finalizar Apuração de ${selectedMonth}?`}
                footer={
                    <div className="flex gap-3 w-full sm:w-auto">
                        <HabitaButton variant="outline" onClick={() => setShowSaveConfirm(false)} className="flex-1 sm:flex-none">
                            Cancelar
                        </HabitaButton>
                        <HabitaButton 
                            variant="primary"
                            onClick={performSave}
                            className="flex-1 sm:flex-none"
                        >
                            Confirmar
                        </HabitaButton>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center p-4">
                    <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-500 flex items-center justify-center mb-6 border border-amber-100 shadow-sm animate-in zoom-in duration-300">
                        <Save size={32} />
                    </div>
                    <p className="text-slate-600 font-medium leading-relaxed">
                        Deseja confirmar o fechamento das leituras de <span className="font-bold text-slate-900">{selectedMonth}</span>?<br/>
                        Os dados serão consolidados para faturamento.
                    </p>
                </div>
            </HabitaModal>

            <HabitaModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                title="Excluir Apuração?"
                footer={
                    <div className="flex gap-3 w-full sm:w-auto">
                        <HabitaButton variant="outline" onClick={() => setShowDeleteConfirm(false)} className="flex-1 sm:flex-none">
                            Manter Registro
                        </HabitaButton>
                        <HabitaButton 
                            variant="danger"
                            onClick={performDelete}
                            className="flex-1 sm:flex-none"
                        >
                            Excluir Tudo
                        </HabitaButton>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center p-4">
                    <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center mb-6 border border-rose-100 shadow-sm animate-in zoom-in duration-300">
                        <Trash2 size={32} />
                    </div>
                    <p className="text-slate-600 font-medium leading-relaxed">
                        Tem certeza que deseja excluir as leituras de <span className="font-bold text-slate-900">{selectedMonth}</span>?<br/>
                        <span className="text-rose-500 text-xs font-bold uppercase tracking-wider">Esta ação não pode ser desfeita.</span>
                    </p>
                </div>
            </HabitaModal>
        </div>
    );
}
