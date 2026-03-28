import React, { useState } from 'react';
import api from '../../services/api';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';

// Habita Design System
import { HabitaButton } from '../../components/ui/HabitaButton';
import { HabitaInput, HabitaTextarea } from '../../components/ui/HabitaForm';
import { HabitaHeading } from '../../components/ui/HabitaHeading';
import { HabitaIconActionButton } from '../../components/ui/HabitaIconActionButton';
import { HabitaCard, HabitaCardTitle, HabitaCardContent } from '../../components/ui/HabitaCard';
import { HabitaBadge } from '../../components/ui/HabitaBadge';

export function PollCreate({ onBack }: { onBack: () => void }) {
    const { user } = useAuth();
    const { tenantId } = useApp();

    
    const { showToast } = useToast();
    const { sendNotification } = useNotifications();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [options, setOptions] = useState<string[]>(['', '']);
    const [endDate, setEndDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleAddOption = () => {
        setOptions([...options, '']);
    };

    const handleRemoveOption = (index: number) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Verifica se há pelo menos duas opções não vazias
        const validOptions = options.filter(opt => opt.trim() !== '');
        if (validOptions.length < 2) {
            showToast('Adicione pelo menos duas opções válidas para a enquete.', 'error');
            return;
        }

        if (!title.trim() || !description.trim() || !endDate) {
            showToast('Preencha os campos obrigatórios.', 'error');
            return;
        }

        const selectedDate = new Date(endDate);
        if (selectedDate <= new Date()) {
            showToast('A data de encerramento deve ser no futuro.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            await api.post('/condo/polls', {
                title: title.trim(),
                description: description.trim(),
                options: validOptions,
                startDate: new Date().toISOString(),
                endDate: selectedDate.toISOString(),
                status: 'active',
                condominiumId: tenantId,
                createdBy: user?.uid
            });

            // Disparar notificação para todos do condomínio
            await sendNotification({
                title: 'Nova Enquete Disponível',
                message: `A enquete "${title}" foi criada. Acesse para votar!`,
                type: 'info',
                userId: 'all'
            });

            showToast('Enquete criada com sucesso!', 'success');
            onBack();
        } catch (error: any) {
            console.error("Erro ao criar enquete:", error);
            showToast('Erro ao criar enquete: ' + (error.response?.data?.error || error.message), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4 mb-8">
                <HabitaIconActionButton
                    icon={<ArrowLeft size={18} />}
                    variant="ghost"
                    size="md"
                    tooltip="Voltar"
                    onClick={onBack}
                    className="text-slate-400 bg-slate-100/50 hover:bg-slate-100"
                />
                <div className="flex flex-col">
                    <HabitaHeading level={2} className="mb-0 border-none p-0">
                        Nova Enquete de Assembleia
                    </HabitaHeading>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                        Crie uma votação estratégica para os moradores
                    </span>
                </div>
            </div>

            <HabitaCard padding="none" className="border-slate-200 shadow-xl shadow-slate-200/50 overflow-visible">
                <form onSubmit={handleSave}>
                    <HabitaCardContent padding="lg" className="space-y-10">
                        <div className="space-y-6">
                            <HabitaCardTitle>Informações Gerais</HabitaCardTitle>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <HabitaInput
                                    label="Título da Enquete de Decisão"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Ex: Aprovação de Pintura da Fachada"
                                    required
                                    className="font-black text-slate-800 uppercase tracking-tight text-base"
                                    containerClassName="md:col-span-2"
                                />

                                <HabitaTextarea
                                    label="Descrição / Detalhamento para os Moradores"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Detalhe o motivo desta enquete, forneça contexto e informações necessárias para a tomada de decisão..."
                                    required
                                    className="min-h-[120px] font-medium text-slate-700 leading-relaxed"
                                    containerClassName="md:col-span-2"
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <HabitaCardTitle>Opções de Voto</HabitaCardTitle>
                                <HabitaBadge variant="outline" className="text-[9px] font-black">Mínimo 2 Opções</HabitaBadge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {options.map((opt, idx) => (
                                    <div key={idx} className="relative group">
                                        <HabitaInput
                                            value={opt}
                                            onChange={e => handleOptionChange(idx, e.target.value)}
                                            placeholder={`Descreva a Opção ${idx + 1}`}
                                            required
                                            className="font-black text-slate-800 uppercase tracking-tight bg-slate-50/30 border-slate-200 h-14 pl-12"
                                        />
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600">
                                            {idx + 1}
                                        </div>
                                        {options.length > 2 && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <HabitaIconActionButton
                                                    icon={<Trash2 size={14} />}
                                                    variant="ghost"
                                                    size="sm"
                                                    tooltip="Remover"
                                                    className="w-8 h-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-slate-100/50"
                                                    onClick={() => handleRemoveOption(idx)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                
                                <button
                                    type="button"
                                    onClick={handleAddOption}
                                    className="h-14 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all active:scale-[0.98]"
                                >
                                    <Plus size={16} /> Adicionar Alternativa
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <HabitaCardTitle>Configurações de Prazo</HabitaCardTitle>
                            <div className="max-w-sm">
                                <HabitaInput
                                    label="Data e Hora de Encerramento"
                                    type="datetime-local"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    required
                                    className="font-black text-slate-800 uppercase tracking-tight h-14"
                                />
                            </div>
                        </div>

                        <div className="pt-8 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-3">
                            <HabitaButton 
                                variant="outline" 
                                onClick={onBack} 
                                className="px-10 h-12 uppercase tracking-[0.2em] font-black text-[10px]"
                            >
                                Cancelar
                            </HabitaButton>

                            <HabitaButton
                                type="submit"
                                isLoading={isSaving}
                                className="px-12 h-12 bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-100 uppercase tracking-[0.2em] font-black text-[10px]"
                            >
                                Publicar Enquete
                            </HabitaButton>
                        </div>
                    </HabitaCardContent>
                </form>
            </HabitaCard>
        </div>
    );
}
