import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { 
    Check, Gauge, AlertCircle, Save, 
    Info, History, Search, Filter, AlertTriangle
} from 'lucide-react';
import { ReadingsManagerPage } from './ReadingsManagerPage';
import { clsx } from 'clsx';
import { hasPermission } from '../utils/rbac';

// Habita Design System
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { HabitaCard } from '../components/ui/HabitaCard';
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaInput } from '../components/ui/HabitaForm';

const MobileReading = () => {
    const { visibleUnits: units, settings, visibleHistory: historyData, saveCurrentReading } = useApp();
    const { profile, isOperator, isAdmin } = useAuth();
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    const [searchTerm, setSearchTerm] = useState('');


    // Responsive Listeners
    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const activeRef = settings.currentRefMonth;

    // A month is "closed" if it exists in historyData
    const isClosed = useMemo(() =>
        historyData.some((h: any) => h.referenceMonth === activeRef),
        [historyData, activeRef]);

    const filteredUnits = useMemo(() => {
        // Filter by permissions first
        let baseUnits = units;
        
        // Use permissions instead of hardcoded roles
        const canSeeAll = hasPermission(profile, 'gas', 'all') || hasPermission(profile, 'history', 'all');
        
        if (!canSeeAll) {
            const linkedUnitIds = profile?.vinculos?.map((v: any) => v.unitId) || [];
            
            const isMatch = (id1: string | null | undefined, id2: string | null | undefined) => {
                if (!id1 || !id2) return false;
                const a = String(id1).toLowerCase().trim();
                const b = String(id2).toLowerCase().trim();
                return a === b || a.endsWith(`_${b}`) || a.endsWith(`-${b}`) || b.endsWith(`_${a}`) || b.endsWith(`-${a}`);
            };

            baseUnits = units.filter(u => {
                if (isMatch(u.id, profile?.unitId)) return true;
                return linkedUnitIds.some((li: string) => isMatch(u.id, li));
            });
        }

        if (!searchTerm) return baseUnits;
        const lowSearch = searchTerm.toLowerCase();
        const final = baseUnits.filter(u => 
            u.id.toString().includes(lowSearch) || 
            (u.ownerName || '').toLowerCase().includes(lowSearch) ||
            (u.block || '').toLowerCase().includes(lowSearch)
        );
        return final;
    }, [units, searchTerm, isAdmin, isOperator, profile]);

    // REDIRECT / SWITCH VIEW
    // Desktop users see the Full Manager (Table)
    if (isDesktop) {
        return <ReadingsManagerPage />;
    }

    if (!activeRef || isClosed) {
        return (
            <div className="w-full animate-in fade-in duration-500 pb-16">
                <HabitaContainer>
                    <HabitaContainerHeader 
                        title="Medição Mobile"
                        subtitle="Coleta de dados em campo"
                        icon={<Gauge size={24} />}
                    />
                    <HabitaContainerContent>
                        <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                            <div className="p-6 bg-amber-50 text-amber-500 rounded-3xl border border-amber-100 shadow-sm animate-pulse">
                                <AlertCircle size={48} />
                            </div>
                            <div className="space-y-2 px-6">
                                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Faturamento Indisponível</h1>
                                <p className="text-slate-500 max-w-md font-medium text-sm">
                                    O período de medição ainda não foi iniciado pela administração ou a competência atual já foi encerrada.
                                </p>
                            </div>
                        </div>
                    </HabitaContainerContent>
                </HabitaContainer>
            </div>
        );
    }

    return (
        <div className="w-full animate-in fade-in duration-500 pb-24">
            <HabitaContainer>
                <HabitaContainerHeader 
                    title={`Medição: ${activeRef}`}
                    subtitle={(isAdmin || isOperator) ? 'Lançamento rápido (Zeladoria)' : 'Consulta de leituras'}
                    icon={<Gauge size={24} className="text-indigo-600" />}
                />

                <HabitaContainerContent className="px-3 md:px-6">
                    {/* Search & Stats Bar */}
                    <div className="mb-6 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <HabitaInput
                                type="text"
                                placeholder="Buscar Unidade, Bloco ou Morador..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-14 pl-12 font-bold text-slate-700"
                            />
                        </div>

                        <div className="flex items-center justify-between px-1">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Progresso da Coleta</span>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-indigo-600 transition-all duration-700"
                                            style={{ width: `${(units.filter(u => u.currentGasReading > (u.lastGasReading || 0)).length / (units.length || 1)) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-700 uppercase">
                                        {units.filter(u => u.currentGasReading > (u.lastGasReading || 0)).length} / {units.length}
                                    </span>
                                </div>
                            </div>
                            <HabitaBadge variant="neutral" size="xs" className="gap-1.5">
                                <Filter size={10} /> {filteredUnits.length} Filtrados
                            </HabitaBadge>
                        </div>
                    </div>

                    {/* Units List */}
                    <div className="space-y-6">
                        {filteredUnits.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })).map((unit) => {
                            // Logic to find the correct previous reading
                            const getPreviousReading = () => {
                                if (!activeRef) return 0;
                                try {
                                    const [m, y] = activeRef.split('/').map(Number);
                                    let prevM = m - 1;
                                    let prevY = y;
                                    if (prevM < 1) { prevM = 12; prevY--; }
                                    const prevRef = `${prevM.toString().padStart(2, '0')}/${prevY}`;
                                    const prevRecord = historyData.find((h: any) => h.referenceMonth === prevRef);
                                    if (prevRecord && prevRecord.units) {
                                        const u = prevRecord.units.find((idx: any) => isMatch(idx.id, unit.id));
                                        return u ? u.currentGasReading : 0;
                                    }
                                } catch (e) { }
                                return unit.lastGasReading || 0;
                            };

                            const prevReading = getPreviousReading();

                            return (
                                <UnitReadingCard
                                    key={unit.id}
                                    unit={unit}
                                    history={historyData}
                                    onSave={saveCurrentReading}
                                    canEdit={isAdmin || isOperator}
                                    settings={settings}
                                    previousReading={prevReading}
                                />
                            );
                        })}

                        {filteredUnits.length === 0 && (
                            <div className="py-20 flex flex-col items-center text-center">
                                <Search size={48} className="text-slate-200 mb-4" />
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhuma unidade encontrada</p>
                            </div>
                        )}
                    </div>
                </HabitaContainerContent>
            </HabitaContainer>
        </div>
    );
};

interface UnitReadingCardProps {
    unit: any;
    history: any[];
    onSave: (unitId: string, reading: number) => Promise<void>;
    canEdit: boolean;
    settings: any;
    previousReading: number;
}

const isMatch = (id1: string | null | undefined, id2: string | null | undefined) => {
    if (!id1 || !id2) return false;
    const a = String(id1).toLowerCase().trim();
    const b = String(id2).toLowerCase().trim();
    return a === b || a.endsWith(`_${b}`) || a.endsWith(`-${b}`) || b.endsWith(`_${a}`) || b.endsWith(`-${a}`);
};

const UnitReadingCard = ({ unit, history, onSave, canEdit, settings, previousReading }: UnitReadingCardProps) => {
    const isActuallyNew = unit.currentGasReading > (previousReading || 0);
    const [inputValue, setInputValue] = useState<string>(isActuallyNew ? unit.currentGasReading?.toString() : '');
    const [isSaving, setIsSaving] = useState(false);
    const [needsConfirmation, setNeedsConfirmation] = useState(false);

    // Calculate last 3 months average consumption
    const averageConsumption = useMemo(() => {
        const unitHistory = history
            .map((h: any) => (h.units || []).find((u: any) => isMatch(u.id, unit.id)))
            .filter((u: any): u is any => !!u)
            .slice(0, 3);

        if (unitHistory.length === 0) return null;

        const totalCons = unitHistory.reduce((sum, u) => {
            const cons = Math.max(0, (u.currentGasReading || 0) - (u.lastGasReading || 0));
            return sum + cons;
        }, 0);

        return totalCons / unitHistory.length;
    }, [history, unit.id]);

    const currentReading = parseFloat(inputValue);
    const isValidNumber = !isNaN(currentReading);
    const consumption = isValidNumber ? Math.max(0, currentReading - previousReading) : 0;

    // Discrepancy check: 40% above average
    const isHighCons = useMemo(() => {
        if (averageConsumption === null || consumption <= 0) return false;
        return consumption > (averageConsumption * 1.4) && consumption > 1;
    }, [consumption, averageConsumption]);

    const isLowerThanLast = isValidNumber && currentReading < previousReading;
    const isFilled = unit.currentGasReading > previousReading;
    const hasChanged = isValidNumber && currentReading !== unit.currentGasReading;

    // Reset confirmation if value changes
    useEffect(() => {
        setNeedsConfirmation(false);
    }, [inputValue]);

    const handleSave = async () => {
        if (!isValidNumber || isLowerThanLast || !hasChanged) return;

        if (isHighCons && !needsConfirmation) {
            setNeedsConfirmation(true);
            return;
        }

        setIsSaving(true);
        try {
            await onSave(unit.id, currentReading);
            setNeedsConfirmation(false);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <HabitaCard 
            className={clsx(
                "transition-all duration-500 overflow-visible",
                isFilled && "border-emerald-200 shadow-lg shadow-emerald-500/5",
                isHighCons && !isLowerThanLast && "ring-2 ring-amber-500/10 border-amber-200"
            )}
            padding="none"
        >
            {/* Card Header */}
            <div className="p-5 border-b border-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all duration-500 border shadow-sm",
                        isFilled ? "bg-emerald-500 text-white border-emerald-400 rotate-3" : "bg-slate-50 text-slate-800 border-slate-100"
                    )}>
                        {unit.id}
                    </div>
                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm leading-none mb-1">
                            {unit.ownerName || 'Unidade Disponível'}
                        </h4>
                        <div className="flex items-center gap-1.5">
                            <HabitaBadge size="xs" variant="neutral">Bloco {unit.block || '-'}</HabitaBadge>
                            {isFilled && !hasChanged && (
                                <HabitaBadge variant="success" size="xs">Processado</HabitaBadge>
                            )}
                        </div>
                    </div>
                </div>
                
                {averageConsumption !== null && (
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em]">Média Histórica</span>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{averageConsumption.toFixed(3)} m³</span>
                    </div>
                )}
            </div>

            {/* Reading Input Area */}
            <div className="p-5 space-y-6">
                <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                        <div className="flex items-center gap-1.5">
                            <History size={11} className="text-slate-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Leitura Anterior: <span className="text-slate-800">{previousReading.toFixed(3)}</span>
                            </span>
                        </div>
                        {consumption > 0 && (
                            <HabitaBadge variant={isHighCons ? 'warning' : 'indigo'} size="xs" className="animate-in fade-in slide-in-from-right-1">
                                cons: +{consumption.toFixed(3)}
                            </HabitaBadge>
                        )}
                    </div>

                    <div className="relative group">
                        {canEdit ? (
                            <div className="space-y-4">
                                <div className="relative">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={inputValue}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(',', '.');
                                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                setInputValue(val);
                                            }
                                        }}
                                        className={clsx(
                                            "w-full h-18 bg-slate-50 border-2 rounded-2xl px-6 font-black text-3xl transition-all placeholder:text-slate-200 outline-none",
                                            isLowerThanLast ? "border-rose-200 text-rose-600 focus:ring-4 focus:ring-rose-500/10" :
                                            isHighCons ? "border-amber-200 text-amber-700 focus:ring-4 focus:ring-amber-500/10" :
                                            "border-slate-100 text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                        )}
                                        placeholder="000.000"
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-200">
                                        <Gauge size={24} />
                                    </div>
                                </div>

                                {/* Alerts */}
                                {isLowerThanLast && (
                                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 animate-in shake duration-300">
                                        <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                                        <p className="text-[10px] font-black text-rose-700 uppercase leading-relaxed">Leitura atual não pode ser inferior à anterior.</p>
                                    </div>
                                )}

                                {isHighCons && !isLowerThanLast && (
                                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3 animate-pulse">
                                        <Info size={16} className="text-amber-600 shrink-0" />
                                        <p className="text-[10px] font-black text-amber-700 uppercase leading-relaxed">Consumo elevado detectado! Verifique possíveis vazamentos.</p>
                                    </div>
                                )}

                                {/* Floating Action Button for Save (if changed) */}
                                {hasChanged && !isLowerThanLast && (
                                    <HabitaButton
                                        onClick={handleSave}
                                        isLoading={isSaving}
                                        className={clsx(
                                            "w-full h-14 shadow-xl active:scale-95 transition-all text-sm uppercase tracking-[0.2em]",
                                            needsConfirmation ? "bg-amber-600 border-amber-600 hover:bg-amber-700 shadow-amber-500/20" : "bg-indigo-600 border-indigo-600 shadow-indigo-500/20"
                                        )}
                                        icon={needsConfirmation ? <Check size={20} /> : <Save size={20} />}
                                    >
                                        {needsConfirmation ? 'Confirmar e Salvar' : 'Gravar Leitura'}
                                    </HabitaButton>
                                )}
                            </div>
                        ) : (
                            <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-2xl font-black text-slate-400 flex items-center justify-between">
                                <span>{unit.currentGasReading > 0 ? unit.currentGasReading.toFixed(3) : 'Aguardando'}</span>
                                <Check size={20} className={isFilled ? "text-emerald-500" : "text-slate-100"} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Estimation Area */}
                {(isFilled || hasChanged) && consumption >= 0 && (
                    <div className="pt-5 border-t border-slate-100 grid grid-cols-2 gap-4">
                        <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">M³ Gasto</span>
                            <span className="text-lg font-black text-slate-800 tracking-tighter">+{consumption.toFixed(3)}</span>
                        </div>
                        <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-100">
                            <span className="text-[8px] font-black text-emerald-600/60 uppercase tracking-widest block mb-1">Est. Financeiro</span>
                            <span className="text-lg font-black text-emerald-800 tracking-tighter">
                                R$ {(consumption * settings.gasPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </HabitaCard>
    );
};

export default MobileReading;
