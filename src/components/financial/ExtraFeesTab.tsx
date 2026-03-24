import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../contexts/ToastContext';
import type { ExtraFee, ExtraFeeValue } from '../../contexts/AppContext';
import { Plus, Pencil, Trash2, Pause, Play, Receipt, AlertCircle, Calendar, Hash } from 'lucide-react';
import { HabitaCard } from '../ui/HabitaCard';
import { HabitaButton } from '../ui/HabitaButton';
import { HabitaBadge } from '../ui/HabitaBadge';
import { HabitaInput } from '../ui/HabitaForm';
import { HabitaModal } from '../ui/HabitaModal';
import { HabitaHeading } from '../ui/HabitaHeading';
import { HabitaCombobox } from '../ui/HabitaCombobox';

interface ExtraFeesTabProps {
    canManage: boolean;
}

export function ExtraFeesTab({ canManage }: ExtraFeesTabProps) {
    const { settings, extraFees, addExtraFee, updateExtraFee, deleteExtraFee, toggleExtraFeeStatus } = useApp();
    const { showToast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [editingFee, setEditingFee] = useState<ExtraFee | null>(null);

    // Form states
    const [name, setName] = useState('');
    const [type, setType] = useState<'recurring' | 'installment'>('recurring');
    const [totalInstallments, setTotalInstallments] = useState('1');
    const [isReserveFund, setIsReserveFund] = useState(false);
    const [values, setValues] = useState<Record<string, string>>({});

    const handleOpenModal = (fee?: ExtraFee) => {
        if (fee) {
            setEditingFee(fee);
            setName(fee.name);
            setType(fee.type);
            setTotalInstallments(fee.totalInstallments?.toString() || '1');
            setIsReserveFund(fee.isReserveFund || false);
            const initialValues: Record<string, string> = {};
            fee.values.forEach(v => {
                initialValues[v.unitTypeId] = v.value.toString();
            });
            setValues(initialValues);
        } else {
            setEditingFee(null);
            setName('');
            setType('recurring');
            setTotalInstallments('1');
            setIsReserveFund(false);
            const initialValues: Record<string, string> = {};
            settings.unitTypes.forEach(ut => {
                initialValues[ut.id] = '0';
            });
            setValues(initialValues);
        }
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        const feeValues: ExtraFeeValue[] = Object.entries(values).map(([unitTypeId, value]) => ({
            unitTypeId,
            value: parseFloat(value) || 0
        }));

        const feeData: ExtraFee = {
            id: editingFee?.id || crypto.randomUUID(),
            name,
            type,
            totalInstallments: type === 'installment' ? parseInt(totalInstallments) : undefined,
            currentInstallment: type === 'installment' ? (editingFee?.currentInstallment || 0) : undefined,
            isReserveFund,
            values: feeValues,
            status: editingFee?.status || 'active',
            createdAt: editingFee?.createdAt || new Date().toISOString(),
            condominiumId: settings.condominiumId
        };

        try {
            if (editingFee) {
                await updateExtraFee(feeData);
            } else {
                await addExtraFee(feeData);
            }
            setShowModal(false);
        } catch (error) {
            console.error("Error saving extra fee:", error);
            showToast("Erro ao salvar taxa.", "error");
        }
    };

    const getStatusBadge = (status: ExtraFee['status']) => {
        switch (status) {
            case 'active':
                return <HabitaBadge variant="success" size="xs">Ativa</HabitaBadge>;
            case 'paused':
                return <HabitaBadge variant="warning" size="xs">Pausada</HabitaBadge>;
            case 'finished':
                return <HabitaBadge variant="neutral" size="xs">Finalizada</HabitaBadge>;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <HabitaHeading 
                    level={4}
                    subtitle="Gestão de taxas fixas ou parceladas fora da cota condominial"
                >
                    Taxas Extras e Recorrentes
                </HabitaHeading>
                {canManage && (
                    <HabitaButton
                        onClick={() => handleOpenModal()}
                        variant="primary"
                        icon={<Plus size={16} />}
                    >
                        Nova Taxa
                    </HabitaButton>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {extraFees.length === 0 ? (
                    <HabitaCard className="col-span-full border border-dashed border-slate-300 bg-slate-50/50" padding="lg">
                        <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
                            <div className="p-4 bg-white text-slate-300 rounded-full shadow-sm">
                                <Receipt size={40} />
                            </div>
                            <div>
                                <h3 className="text-slate-800 font-bold">Nenhuma taxa cadastrada</h3>
                                <p className="text-slate-500 text-xs">Crie taxas para serem cobradas automaticamente no fechamento do mês.</p>
                            </div>
                        </div>
                    </HabitaCard>
                ) : (
                    extraFees.map(fee => (
                        <HabitaCard key={fee.id} className="border border-slate-200 hover:border-indigo-200 transition-colors group" padding="none">
                            <div className="p-5 space-y-5">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-bold text-slate-800 text-sm">{fee.name}</h3>
                                            {getStatusBadge(fee.status)}
                                            {fee.isReserveFund && (
                                                <HabitaBadge variant="warning" size="xs">
                                                    Reserva
                                                </HabitaBadge>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                            {fee.type === 'recurring' ? (
                                                <><Calendar size={12} className="text-slate-400" /> Recorrente</>
                                            ) : (
                                                <><Hash size={12} className="text-slate-400" /> Parcelada ({fee.currentInstallment}/{fee.totalInstallments})</>
                                            )}
                                        </p>
                                    </div>
                                    <div className="p-2 bg-slate-50 text-slate-400 rounded h-fit border border-slate-100">
                                        <Receipt size={18} />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center justify-between">
                                        Valores por Tipologia
                                        <span className="font-normal lowercase">mensal</span>
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {fee.values.map(v => {
                                            const ut = settings.unitTypes.find(t => t.id === v.unitTypeId);
                                            return (
                                                <div key={v.unitTypeId} className="flex flex-col bg-slate-50/50 p-2 rounded border border-slate-100/50">
                                                    <span className="text-[10px] text-slate-500 font-medium truncate">{ut?.name || 'Tipo ?'}</span>
                                                    <span className="text-xs font-bold text-slate-800">{v.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {canManage && (
                                    <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                                        <HabitaButton
                                            onClick={() => handleOpenModal(fee)}
                                            variant="secondary"
                                            size="sm"
                                            className="flex-1"
                                            icon={<Pencil size={12} />}
                                        >
                                            Editar
                                        </HabitaButton>
                                        <button
                                            onClick={() => {
                                                if (fee.status === 'active') toggleExtraFeeStatus(fee.id, 'paused');
                                                else if (fee.status === 'paused') toggleExtraFeeStatus(fee.id, 'active');
                                            }}
                                            className={`w-10 h-8 rounded-md flex items-center justify-center transition-all border ${fee.status === 'active' ? 'bg-orange-50 border-orange-100 text-orange-600 hover:bg-orange-100' : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'}`}
                                            title={fee.status === 'active' ? 'Pausar' : 'Ativar'}
                                        >
                                            {fee.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm('Tem certeza que deseja excluir esta taxa?')) {
                                                    deleteExtraFee(fee.id);
                                                }
                                            }}
                                            className="w-10 h-8 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 rounded-md flex items-center justify-center transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </HabitaCard>
                    ))
                )}
            </div>

            {/* Modal */}
            <HabitaModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingFee ? 'Editar Taxa' : 'Nova Taxa Extra'}
            >
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-4">
                        <HabitaInput
                            label="Nome da Taxa"
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ex: Pintura da Fachada"
                            required
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <HabitaCombobox
                                label="Tipo"
                                value={type}
                                onChange={(val: any) => setType(val)}
                                options={[
                                    { label: 'Recorrente', value: 'recurring' },
                                    { label: 'Parcelada', value: 'installment' }
                                ]}
                            />
                            
                            {type === 'installment' && (
                                <HabitaInput
                                    label="Total de Parcelas"
                                    type="number"
                                    min="1"
                                    value={totalInstallments}
                                    onChange={e => setTotalInstallments(e.target.value)}
                                    required
                                    className="font-bold"
                                />
                            )}
                        </div>
                        
                        <div className="mt-4 flex items-start gap-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                            <div className="pt-0.5">
                                <input 
                                    type="checkbox" 
                                    id="is-reserve" 
                                    checked={isReserveFund}
                                    onChange={e => setIsReserveFund(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                />
                            </div>
                            <div className="flex-1">
                                <label htmlFor="is-reserve" className="text-sm font-bold text-slate-800 cursor-pointer block">
                                    Destinar arrecadação ao Fundo de Reserva
                                </label>
                                <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                                    Ao fechar o mês, o valor arrecadado desta taxa será somado ao Saldo do Fundo de Reserva automaticamente.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 border-t border-slate-100 pt-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <AlertCircle size={10} className="text-indigo-500" />
                            Valores por Tipologia (R$)
                        </h4>
                        <div className="grid grid-cols-1 gap-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                            {settings.unitTypes.map(ut => (
                                <div key={ut.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg group-within:border-indigo-200 transition-colors">
                                    <span className="text-xs font-bold text-slate-700">{ut.name}</span>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={values[ut.id] || ''}
                                            onChange={e => setValues({ ...values, [ut.id]: e.target.value })}
                                            className="w-28 pl-8 pr-3 h-8 bg-white border border-slate-200 rounded text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="0,00"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        {settings.unitTypes.length === 0 && (
                            <p className="text-[10px] text-orange-500 font-bold italic">Nenhuma tipologia configurada.</p>
                        )}
                    </div>

                    <div className="flex gap-3 pt-6">
                        <HabitaButton
                            type="button"
                            onClick={() => setShowModal(false)}
                            variant="outline"
                            className="flex-1"
                        >
                            Cancelar
                        </HabitaButton>
                        <HabitaButton
                            type="submit"
                            variant="primary"
                            className="flex-1"
                        >
                            {editingFee ? 'Salvar Alterações' : 'Criar Taxa'}
                        </HabitaButton>
                    </div>
                </form>
            </HabitaModal>
        </div>
    );
}
