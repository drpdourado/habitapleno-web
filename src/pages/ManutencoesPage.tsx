import { useState, useMemo } from 'react';
import {
    Wrench, Plus, Pencil, Trash2, Check,
    Calendar, Clock, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useApp, type Manutencao } from '../contexts/AppContext';
import { hasPermission } from '../utils/rbac';

import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaInput } from '../components/ui/HabitaForm';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaTable, HabitaTHead, HabitaTBody, HabitaTR, HabitaTH, HabitaTD } from '../components/ui/HabitaTable';
import { HabitaDatePicker } from '../components/ui/HabitaDatePicker';
import { HabitaStatGrid } from '../components/ui/HabitaStatGrid';
import { HabitaStatGrid3x1 } from '../components/ui/HabitaStatGrid3x1';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { HabitaIconActionButton } from '../components/ui/HabitaIconActionButton';


export function ManutencoesPage() {
    const { isAdmin, accessProfile } = useAuth();
    const canManage = isAdmin || hasPermission(accessProfile, 'manutencoes', 'all');
    const { showToast } = useToast();
    const { manutencoes, addManutencao, updateManutencao, deleteManutencao, concluirManutencao } = useApp();

    // UI state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingManutencao, setEditingManutencao] = useState<Manutencao | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isConcluindo, setIsConcluindo] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        titulo: '',
        frequenciaValor: 1,
        frequenciaUnidade: 'meses' as 'dias' | 'meses' | 'anos',
        ultimaRealizacao: new Date().toISOString().split('T')[0]
    });

    // Calculate real-time status and sort by próxima data
    const manutencoesComStatus = useMemo(() => {
        return [...manutencoes].sort((a, b) => new Date(a.proximaData).getTime() - new Date(b.proximaData).getTime());
    }, [manutencoes]);

    const openModal = (m?: Manutencao) => {
        if (m) {
            setEditingManutencao(m);
            setFormData({
                titulo: m.titulo,
                frequenciaValor: m.frequenciaValor || 1,
                frequenciaUnidade: m.frequenciaUnidade || 'meses',
                ultimaRealizacao: m.ultimaRealizacao
            });
        } else {
            setEditingManutencao(null);
            setFormData({
                titulo: '',
                frequenciaValor: 1,
                frequenciaUnidade: 'meses',
                ultimaRealizacao: new Date().toISOString().split('T')[0]
            });
        }
        setIsModalOpen(true);
    };

    const calcProximaData = (ultimaRealizacao: string, valor: number, unidade: 'dias' | 'meses' | 'anos'): string => {
        const data = new Date(ultimaRealizacao + 'T12:00:00'); // Use midday to avoid TZ issues
        
        if (unidade === 'dias') {
            data.setDate(data.getDate() + valor);
        } else if (unidade === 'meses') {
            const dayOfMonth = data.getDate();
            data.setMonth(data.getMonth() + valor);
            // Handling month overflow (e.g. 31 Jan + 1 month = 28/29 Feb instead of 3rd March)
            if (data.getDate() !== dayOfMonth) {
                data.setDate(0);
            }
        } else if (unidade === 'anos') {
            data.setFullYear(data.getFullYear() + valor);
        }
        
        return data.toISOString().split('T')[0];
    };

    const getFrequenciaLabel = (valor: number, unidade: string) => {
        const labels: Record<string, { s: string; p: string }> = {
            dias: { s: 'Dia', p: 'Dias' },
            meses: { s: 'Mês', p: 'Meses' },
            anos: { s: 'Ano', p: 'Anos' }
        };
        const l = labels[unidade] || labels.meses;
        return `${valor} ${valor === 1 ? l.s : l.p}`.toUpperCase();
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.titulo.trim()) {
            showToast('Por favor, informe o nome da tarefa.', 'warning');
            return;
        }

        if (formData.frequenciaValor < 1) {
            showToast('A frequência deve ser de pelo menos um período.', 'warning');
            return;
        }

        try {
            const proximaData = calcProximaData(formData.ultimaRealizacao, formData.frequenciaValor, formData.frequenciaUnidade);
            if (editingManutencao) {
                await updateManutencao({
                    ...editingManutencao,
                    titulo: formData.titulo,
                    frequenciaValor: formData.frequenciaValor,
                    frequenciaUnidade: formData.frequenciaUnidade,
                    ultimaRealizacao: formData.ultimaRealizacao,
                    proximaData
                });
                showToast('Manutenção atualizada!', 'success');
            } else {
                const nova: Manutencao = {
                    id: crypto.randomUUID(),
                    titulo: formData.titulo,
                    frequenciaValor: formData.frequenciaValor,
                    frequenciaUnidade: formData.frequenciaUnidade,
                    ultimaRealizacao: formData.ultimaRealizacao,
                    proximaData
                };
                await addManutencao(nova);
                showToast('Manutenção cadastrada com sucesso!', 'success');
            }
            setIsModalOpen(false);
        } catch (error) {
            showToast('Erro ao salvar manutenção.', 'error');
        }
    };

    const confirmDelete = async () => {
        if (!isDeleting) return;
        try {
            await deleteManutencao(isDeleting);
            showToast('Manutenção removida.', 'info');
        } catch (error) {
            showToast('Erro ao remover manutenção.', 'error');
        } finally {
            setIsDeleting(null);
        }
    };

    const handleConcluir = async (id: string) => {
        setIsConcluindo(id);
        try {
            await concluirManutencao(id, {});
            showToast('Manutenção concluída com sucesso!', 'success');
        } catch (err) {
            showToast('Erro ao concluir manutenção.', 'error');
        } finally {
            setIsConcluindo(null);
        }
    };

    const getStatusInfo = (m: Manutencao) => {
        const proxDate = new Date(m.proximaData + 'T23:59:59');
        const hoje = new Date();
        const diffDays = Math.ceil((proxDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { label: `Atrasado ${Math.abs(diffDays)}d` };
        } else if (diffDays <= 7) {
            return { label: `Vence em ${diffDays}d` };
        }
        return { label: 'Em dia' };
    };

    return (
        <div className="w-full animate-in fade-in duration-700 pb-12">
            <HabitaContainer>
                <HabitaContainerHeader 
                    title="Manutenções Preventivas"
                    subtitle="Gestão de Tarefas Cíclicas do Condomínio"
                    icon={<Wrench size={24} />}
                    iconVariant="indigo"
                    actions={
                        canManage && (
                            <HabitaButton
                                onClick={() => openModal()}
                                variant="primary"
                                className="bg-slate-900 border-slate-900 hover:bg-slate-800"
                                icon={<Plus size={18} />}
                            >
                                Nova Manutenção
                            </HabitaButton>
                        )
                    }
                />

                <HabitaContainerContent padding="none">
                    <div className="p-3 md:p-8 flex flex-col gap-4 md:gap-8">

                        {/* KPI Summary - Unified Grid */}
                        <div className="hidden md:block">
                            <HabitaStatGrid 
                                title="Monitoramento de Manutenções"
                                icon={<Wrench className="text-indigo-500" />}
                                metrics={[
                                    {
                                        label: "TOTAL DE TAREFAS",
                                        value: manutencoesComStatus.length,
                                        icon: <Wrench />,
                                        variant: "slate",
                                        subtext: "Cronograma Geral"
                                    },
                                    {
                                        label: "TAREFAS EM ATRASO",
                                        value: manutencoesComStatus.filter(m => m.statusBadge === 'error').length,
                                        icon: <AlertTriangle />,
                                        variant: "rose",
                                        subtext: "Prioridade Imediata"
                                    },
                                    {
                                        label: "TAREFAS EM DIA",
                                        value: manutencoesComStatus.filter(m => m.statusBadge !== 'error').length,
                                        icon: <CheckCircle2 />,
                                        variant: "emerald",
                                        subtext: "Status de Atividade"
                                    }
                                ]}
                                cols={3}
                            />
                        </div>

                        <div className="md:hidden">
                            <HabitaStatGrid3x1 
                                title="Monitoramento de Manutenções"
                                icon={<Wrench className="text-indigo-500" />}
                                metrics={[
                                    {
                                        label: "TOTAL DE TAREFAS",
                                        value: manutencoesComStatus.length,
                                        icon: <Wrench />,
                                        variant: "slate",
                                        subtext: "Cronograma Geral"
                                    },
                                    {
                                        label: "TAREFAS EM ATRASO",
                                        value: manutencoesComStatus.filter(m => m.statusBadge === 'error').length,
                                        icon: <AlertTriangle />,
                                        variant: "rose",
                                        subtext: "Prioridade Imediata"
                                    },
                                    {
                                        label: "TAREFAS EM DIA",
                                        value: manutencoesComStatus.filter(m => m.statusBadge !== 'error').length,
                                        icon: <CheckCircle2 />,
                                        variant: "emerald",
                                        subtext: "Status de Atividade"
                                    }
                                ]}
                            />
                        </div>

                {/* Table Section */}
                <HabitaTable
                    responsive
                    mobileVariant="list"
                    isEmpty={manutencoesComStatus.length === 0}
                    emptyMessage="Nenhuma manutenção cadastrada."
                    containerClassName="border border-slate-100 rounded-2xl overflow-hidden shadow-none"
                >
                    <HabitaTHead>
                        <HabitaTR>
                            <HabitaTH>Tarefa</HabitaTH>
                            <HabitaTH>Frequência</HabitaTH>
                            <HabitaTH>Última Realização</HabitaTH>
                            <HabitaTH>Próxima Data</HabitaTH>
                            <HabitaTH>Status</HabitaTH>
                            <HabitaTH className="text-right">Ações</HabitaTH>
                        </HabitaTR>
                    </HabitaTHead>
                    <HabitaTBody>
                        {manutencoesComStatus.map((m: any) => {
                            const info = getStatusInfo(m);
                            return (
                                <HabitaTR key={m.id} className="group">
                                    {/* Mobile Layout */}
                                    <HabitaTD responsive={false} className="md:hidden block w-full py-3 px-4 border-b border-slate-50 last:border-none">
                                        <div className="flex flex-col gap-2.5 w-full">
                                            <div className="flex justify-between items-start w-full">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-800 uppercase tracking-tight leading-tight">{m.titulo}</span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <HabitaBadge variant="neutral" size="xs">
                                                            {getFrequenciaLabel(m.frequenciaValor || m.frequenciaMeses || 1, m.frequenciaUnidade || 'meses')}
                                                        </HabitaBadge>
                                                    </div>
                                                </div>
                                                <HabitaBadge 
                                                    variant={m.statusBadge}
                                                    size="xs"
                                                >
                                                    {info.label.toUpperCase()}
                                                </HabitaBadge>
                                            </div>

                                            <div className="flex items-center justify-between w-full pt-1">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[10px] uppercase tracking-tighter">
                                                        <Clock size={12} className="text-slate-300" />
                                                        <span>Vence: <b>{new Date(m.proximaData + 'T00:00:00').toLocaleDateString('pt-BR')}</b></span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 ml-auto shrink-0">
                                                    <HabitaIconActionButton
                                                        icon={<Check />}
                                                        variant="success"
                                                        size="md"
                                                        tooltip="Concluir"
                                                        isLoading={isConcluindo === m.id}
                                                        className="bg-emerald-50 border-emerald-100"
                                                        onClick={() => handleConcluir(m.id)}
                                                    />
                                                    {canManage && (
                                                        <>
                                                            <HabitaIconActionButton
                                                                icon={<Pencil />}
                                                                variant="ghost"
                                                                size="md"
                                                                tooltip="Editar"
                                                                className="hover:text-indigo-600 hover:bg-indigo-50"
                                                                onClick={() => openModal(m)}
                                                            />
                                                            <HabitaIconActionButton
                                                                icon={<Trash2 />}
                                                                variant="ghost"
                                                                size="md"
                                                                tooltip="Excluir"
                                                                className="hover:text-rose-600 hover:bg-rose-50"
                                                                onClick={() => setIsDeleting(m.id)}
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </HabitaTD>

                                    {/* Desktop Layout */}
                                    <HabitaTD className="hidden md:table-cell py-5">
                                        <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{m.titulo}</span>
                                    </HabitaTD>
                                    <HabitaTD className="hidden md:table-cell py-5">
                                        <HabitaBadge variant="neutral" size="xs">
                                            {getFrequenciaLabel(m.frequenciaValor || m.frequenciaMeses || 1, m.frequenciaUnidade || 'meses')}
                                        </HabitaBadge>
                                    </HabitaTD>
                                    <HabitaTD className="hidden md:table-cell py-5">
                                        <div className="flex items-center gap-2 text-slate-500 font-medium">
                                            <Calendar size={14} className="text-slate-300" />
                                            <span className="text-xs">{new Date(m.ultimaRealizacao + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                        </div>
                                    </HabitaTD>
                                    <HabitaTD className="hidden md:table-cell py-5">
                                        <div className="flex items-center gap-2 text-slate-800 font-black">
                                            <Clock size={14} className="text-slate-400" />
                                            <span className="text-xs">{new Date(m.proximaData + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                        </div>
                                    </HabitaTD>
                                    <HabitaTD className="hidden md:table-cell py-5">
                                        <HabitaBadge 
                                            variant={m.statusBadge}
                                            className="animate-in fade-in zoom-in-95 duration-500"
                                        >
                                            {info.label.toUpperCase()}
                                        </HabitaBadge>
                                    </HabitaTD>
                                    <HabitaTD className="hidden md:table-cell py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <HabitaIconActionButton
                                                icon={<Check />}
                                                variant="success"
                                                size="sm"
                                                tooltip="Concluir Manutenção"
                                                isLoading={isConcluindo === m.id}
                                                className="bg-emerald-50 border-emerald-100"
                                                onClick={() => handleConcluir(m.id)}
                                            />
                                            {canManage && (
                                                <>
                                                    <HabitaIconActionButton
                                                        icon={<Pencil />}
                                                        variant="ghost"
                                                        size="sm"
                                                        tooltip="Editar"
                                                        className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                        onClick={() => openModal(m)}
                                                    />
                                                    <HabitaIconActionButton
                                                        icon={<Trash2 />}
                                                        variant="ghost"
                                                        size="sm"
                                                        tooltip="Excluir"
                                                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                        onClick={() => setIsDeleting(m.id)}
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

            {/* Modal: Nova / Editar Manutenção */}
            <HabitaModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingManutencao ? 'Editar Manutenção' : 'Nova Manutenção'}
            >
                <form onSubmit={handleSave} className="space-y-6">
                    <HabitaInput
                        label="Nome da Tarefa"
                        required
                        value={formData.titulo}
                        onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                        placeholder="Ex: Limpeza de Caixas d'Água"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 pl-1">Frequência</label>
                             <div className="flex gap-2">
                                <HabitaInput
                                    type="number"
                                    required
                                    min={1}
                                    max={999}
                                    value={formData.frequenciaValor}
                                    onChange={e => setFormData({ ...formData, frequenciaValor: parseInt(e.target.value) || 1 })}
                                    className="flex-1"
                                    placeholder="Valor"
                                />
                                <select 
                                    className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl focus:ring-violet-500 focus:border-violet-500 block w-[100px] p-2.5 font-bold uppercase tracking-tight outline-none"
                                    value={formData.frequenciaUnidade}
                                    onChange={e => setFormData({ ...formData, frequenciaUnidade: e.target.value as any })}
                                >
                                    <option value="dias">Dias</option>
                                    <option value="meses">Meses</option>
                                    <option value="anos">Anos</option>
                                </select>
                             </div>
                        </div>

                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 pl-1">Última Realização</label>
                             <HabitaDatePicker
                                value={formData.ultimaRealizacao ? new Date(formData.ultimaRealizacao + 'T00:00:00') : undefined}
                                onChange={(date) => setFormData({ ...formData, ultimaRealizacao: date.toISOString().split('T')[0] })}
                            />
                        </div>
                    </div>

                    {/* Preview da próxima data calculada */}
                    {formData.ultimaRealizacao && formData.frequenciaValor > 0 && (
                        <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm">
                                <Clock size={20} />
                            </div>
                            <div>
                                <span className="text-[9px] font-black text-violet-400 uppercase tracking-[0.2em]">Próxima data estimada</span>
                                <p className="text-sm font-black text-violet-700 uppercase tracking-tight">
                                    {new Date(calcProximaData(formData.ultimaRealizacao, formData.frequenciaValor, formData.frequenciaUnidade) + 'T00:00:00').toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 flex gap-3">
                        <HabitaButton
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            variant="outline"
                            className="flex-1"
                        >
                            Cancelar
                        </HabitaButton>
                        <HabitaButton
                            type="submit"
                            variant="primary"
                            className="flex-[2] bg-violet-600 border-violet-600 hover:bg-violet-700"
                        >
                            {editingManutencao ? 'Salvar Alterações' : 'Cadastrar Manutenção'}
                        </HabitaButton>
                    </div>
                </form>
            </HabitaModal>

            {/* Deletion Confirmation */}
            <HabitaModal
                isOpen={!!isDeleting}
                onClose={() => setIsDeleting(null)}
                title="Excluir Manutenção?"
            >
                <div className="space-y-6">
                    <p className="text-slate-500 text-sm">
                        Deseja realmente remover esta tarefa de manutenção? Esta ação não pode ser desfeita.
                    </p>
                    <div className="flex gap-3">
                        <HabitaButton
                            onClick={() => setIsDeleting(null)}
                            variant="outline"
                            className="flex-1"
                        >
                            Cancelar
                        </HabitaButton>
                        <HabitaButton
                            onClick={confirmDelete}
                            variant="primary"
                            className="flex-1 bg-rose-600 border-rose-600 hover:bg-rose-700"
                        >
                            Confirmar Exclusão
                        </HabitaButton>
                    </div>
                </div>
            </HabitaModal>
            </div>
                </HabitaContainerContent>
            </HabitaContainer>
        </div>
    );
}

export default ManutencoesPage;
