import { useState, useMemo, useEffect } from 'react';
import {
    AlertCircle, Plus,
    Calendar, Tag,
    CheckCircle2,
    Trash2, Pencil,
    ArrowRight, Clock, Info, AlertTriangle, Shield
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useApp, type Ocorrencia } from '../contexts/AppContext';
import * as dbUtils from '../utils/FirebaseUtils';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import heic2any from 'heic2any';

import { HabitaCard } from '../components/ui/HabitaCard';
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaHeading } from '../components/ui/HabitaHeading';
import { HabitaInput, HabitaTextarea } from '../components/ui/HabitaForm';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaTabs } from '../components/ui/HabitaTabs';
import { HabitaMobileTabs } from '../components/ui/HabitaMobileTabs';
import { HabitaCombobox } from '../components/ui/HabitaCombobox';
import { HabitaIconActionButton } from '../components/ui/HabitaIconActionButton';
import { HabitaFileUpload } from '../components/ui/HabitaFileUpload';
import { HabitaSpinner } from '../components/ui/HabitaSpinner';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const CATEGORIAS = [
    'Barulho',
    'Infraestrutura',
    'Segurança',
    'Limpeza',
    'Vizinhança',
    'Manutenção',
    'Outros'
];

interface HeicImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
}

const HeicImage = ({ src, alt, className, ...props }: HeicImageProps) => {
    const [processedSrc, setProcessedSrc] = useState<string>(src);
    const [isConverting, setIsConverting] = useState(false);

    useEffect(() => {
        const isHeic = src.toLowerCase().includes('.heic') || src.toLowerCase().includes('.heif');
        
        if (isHeic) {
            const convertHeic = async () => {
                setIsConverting(true);
                try {
                    const response = await fetch(src);
                    const blob = await response.blob();
                    const convertedBlob = await heic2any({
                        blob: blob,
                        toType: 'image/jpeg',
                        quality: 0.7
                    });
                    const resultBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                    const url = URL.createObjectURL(resultBlob);
                    setProcessedSrc(url);
                } catch (err) {
                    console.error("Failed to convert HEIC for display:", err);
                } finally {
                    setIsConverting(false);
                }
            };
            convertHeic();
        } else {
            setProcessedSrc(src);
        }
    }, [src]);

    if (isConverting) {
        return (
            <div className={cn("flex items-center justify-center bg-slate-100", className)}>
                <HabitaSpinner size="xs" />
            </div>
        );
    }

    return <img src={processedSrc} alt={alt} className={className} {...props} />;
};

export function OcorrenciasPage() {
    const { isAdmin, isOperator, profile } = useAuth();
    const { showToast } = useToast();
    const { visibleOcorrencias, addOcorrencia, updateOcorrencia, deleteOcorrencia, tenantId } = useApp();

    // UI state
    const [filter, setFilter] = useState<'Todas' | 'Pendentes' | 'Resolvidas'>('Todas');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState<Ocorrencia | null>(null);
    const [editingOcorrencia, setEditingOcorrencia] = useState<Ocorrencia | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        titulo: '',
        categoria: CATEGORIAS[0],
        prioridade: 'Média' as 'Baixa' | 'Média' | 'Alta',
        descricao: ''
    });
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const filteredOcorrencias = useMemo(() => {
        return visibleOcorrencias.filter(oc => {
            if (filter === 'Todas') return true;
            if (filter === 'Pendentes') return oc.status === 'Pendente' || oc.status === 'Aberto';
            if (filter === 'Resolvidas') return oc.status === 'Resolvida' || oc.status === 'Fechado';
            return true;
        });
    }, [visibleOcorrencias, filter]);

    const openModal = (oc?: Ocorrencia) => {
        setPhotoFile(null);
        if (oc) {
            setEditingOcorrencia(oc);
            setFormData({
                titulo: oc.titulo,
                categoria: oc.categoria,
                prioridade: (oc.prioridade as any) || 'Média',
                descricao: oc.descricao
            });
            setPhotoPreview(oc.photoUrl || null);
        } else {
            setEditingOcorrencia(null);
            setFormData({
                titulo: '',
                categoria: CATEGORIAS[0],
                prioridade: 'Média',
                descricao: ''
            });
            setPhotoPreview(null);
        }
        setIsModalOpen(true);
    };

    const removePhoto = () => {
        setPhotoFile(null);
        setPhotoPreview(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        if (e) e.preventDefault();
        
        if (!formData.titulo.trim() || !formData.descricao.trim()) {
            showToast('Por favor, preencha o título e a descrição.', 'warning');
            return;
        }

        setIsSaving(true);
        try {
            let finalPhotoUrl = editingOcorrencia?.photoUrl || '';
            const incidentId = editingOcorrencia?.id || crypto.randomUUID();

            if (photoFile) {
                // Guideline 3: Structured path condominios/condominiumId/ocorrencias/ID_DA_OCORRENCIA/nome_foto.jpg
                // The 'condominios/' prefix is REQUIRED by the storage.rules namespace
                const customPath = `condominios/${tenantId}/ocorrencias/${incidentId}/${photoFile.name}`;
                finalPhotoUrl = await dbUtils.uploadFile(photoFile, customPath);
                
                // If there was an old photo and the new upload succeeded, delete the old one
                if (editingOcorrencia?.photoUrl) {
                    await dbUtils.deleteFileFromStorage(editingOcorrencia.photoUrl);
                }
            } else if (editingOcorrencia?.photoUrl && !photoPreview) {
                // If there was a photo but it was manually removed by the user
                await dbUtils.deleteFileFromStorage(editingOcorrencia.photoUrl);
                finalPhotoUrl = '';
            }

            if (editingOcorrencia) {
                await updateOcorrencia({
                    ...editingOcorrencia,
                    ...formData,
                    photoUrl: finalPhotoUrl
                });
                showToast('Ocorrência atualizada!', 'success');
            } else {
                const NovaOcorrencia: Ocorrencia = {
                    id: incidentId,
                    titulo: formData.titulo,
                    categoria: formData.categoria,
                    prioridade: formData.prioridade,
                    status: 'Pendente',
                    dataAbertura: new Date().toISOString(),
                    descricao: formData.descricao,
                    unitId: profile?.unitId || '',
                    userName: profile?.name || 'Habitante',
                    photoUrl: finalPhotoUrl
                };
                await addOcorrencia(NovaOcorrencia);
                
                showToast('Ocorrência registrada! O síndico será notificado.', 'success');
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            showToast(error instanceof Error ? error.message : 'Erro ao processar.', 'error');
        } finally {
            setIsSaving(false);
        }
    };       
    

    const confirmDelete = async () => {
        if (!isDeleting) return;
        try {
            await deleteOcorrencia(isDeleting);
            showToast('Ocorrência removida.', 'info');
        } catch (error) {
            showToast('Erro ao remover ocorrência.', 'error');
        } finally {
            setIsDeleting(null);
        }
    };

    const getPriorityIcon = (p: string) => {
        switch (p) {
            case 'Alta': return <AlertTriangle size={12} />;
            case 'Média': return <Info size={12} />;
            default: return <Shield size={12} />;
        }
    };

    return (
        <div className="w-full space-y-8 animate-in fade-in duration-700 pb-12">
            <HabitaCard className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                {/* Header Integrado */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-100 pb-8">
                    <div>
                        <HabitaHeading level={1} className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200/50">
                                <AlertCircle className="text-white" size={24} />
                            </div>
                            Central de Ocorrências
                        </HabitaHeading>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-3 flex items-center gap-2">
                             Acompanhamento e Resolução de Problemas
                        </p>
                    </div>

                    <HabitaButton
                        onClick={() => openModal()}
                        variant="primary"
                        className="bg-slate-900 border-slate-900 hover:bg-slate-800"
                        icon={<Plus size={18} />}
                    >
                        Nova Ocorrência
                    </HabitaButton>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed mb-8">
                    <div className="bg-white p-1 rounded-xl border border-slate-200 hidden md:inline-flex shadow-sm">
                        <HabitaTabs 
                            tabs={[
                                { id: 'Todas', label: 'Todas as Ocorrências' },
                                { id: 'Pendentes', label: 'Pendentes' },
                                { id: 'Resolvidas', label: 'Resolvidas' }
                            ]}
                            activeTab={filter}
                            onChange={(id) => setFilter(id as any)}
                            className="border-none bg-transparent p-0"
                        />
                    </div>

                    <HabitaMobileTabs
                        tabs={[
                            { id: 'Todas', label: 'Todas' },
                            { id: 'Pendentes', label: 'Pendentes' },
                            { id: 'Resolvidas', label: 'Resolvidas' }
                        ]}
                        activeTab={filter}
                        onChange={(id) => setFilter(id as any)}
                        className="md:hidden"
                        label="Filtrar Relatos"
                    />
                    
                    <div className="flex items-center gap-2">
                        <HabitaBadge variant="neutral" size="xs">{filteredOcorrencias.length} REGISTROS</HabitaBadge>
                    </div>
                </div>

            {/* Listagem */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOcorrencias.length === 0 ? (
                    <div className="col-span-full py-24 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                            <CheckCircle2 size={40} className="text-slate-200" />
                        </div>
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Tudo em ordem</h3>
                        <p className="text-xs text-slate-300 font-medium mt-2 max-w-sm">Nenhuma ocorrência encontrada para este filtro.</p>
                        <HabitaButton
                            onClick={() => openModal()}
                            variant="ghost"
                            className="mt-6 text-amber-600 hover:bg-amber-50"
                            icon={<ArrowRight size={14} />}
                        >
                            Registrar primeira ocorrência
                        </HabitaButton>
                    </div>
                ) : (
                    filteredOcorrencias.map((oc) => (
                        <HabitaCard
                            key={oc.id}
                            onClick={() => setIsDetailOpen(oc)}
                            className="group relative border-2 border-slate-100 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col h-full"
                        >
                            {oc.photoUrl ? (
                                <div className="h-40 -mx-6 -mt-6 mb-6 overflow-hidden relative border-b border-slate-100 bg-slate-100 flex items-center justify-center">
                                    <HeicImage 
                                        src={oc.photoUrl} 
                                        alt={oc.titulo} 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
                                    <div className="absolute bottom-3 right-3 w-8 h-8 bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20">
                                        <Camera size={14} />
                                    </div>
                                </div>
                            ) : (
                                <div className="h-1 -mx-6 -mt-6 mb-6 bg-slate-50 border-b border-slate-100" />
                            )}
                            {/* Priority Indicator */}
                            <div className={cn(
                                "absolute top-0 left-0 w-1 h-full",
                                oc.prioridade === 'Alta' ? 'bg-rose-500' :
                                oc.prioridade === 'Média' ? 'bg-amber-500' : 'bg-emerald-500'
                            )} />

                            <div className="flex items-center justify-between mb-4">
                                <div className="flex gap-2">
                                    <HabitaBadge 
                                        variant={(oc.status === 'Resolvida' || oc.status === 'Fechado') ? 'success' : 'warning'} 
                                        size="xs"
                                    >
                                        {(oc.status || '').toUpperCase()}
                                    </HabitaBadge>
                                    <HabitaBadge 
                                        variant={oc.prioridade === 'Alta' ? 'error' : oc.prioridade === 'Média' ? 'warning' : 'success'} 
                                        size="xs"
                                        className="gap-1"
                                    >
                                        {getPriorityIcon(oc.prioridade || 'Baixa')} {(oc.prioridade || '').toUpperCase()}
                                    </HabitaBadge>
                                </div>
                                
                                <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                    {(isAdmin || isOperator || profile?.uid === oc.unitId) && (
                                        <HabitaIconActionButton
                                            icon={<Pencil />}
                                            variant="ghost"
                                            size="sm"
                                            tooltip="Editar"
                                            className="hover:text-indigo-600 hover:bg-indigo-50"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openModal(oc);
                                            }}
                                        />
                                    )}
                                    {(isAdmin || profile?.uid === oc.unitId) && (
                                        <HabitaIconActionButton
                                            icon={<Trash2 />}
                                            variant="ghost"
                                            size="sm"
                                            tooltip="Excluir"
                                            className="hover:text-rose-600 hover:bg-rose-50"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsDeleting(oc.id);
                                            }}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Tag size={12} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{oc.categoria}</span>
                                </div>
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-tight group-hover:text-amber-600 transition-colors">
                                    {oc.titulo}
                                </h3>
                                <p className="text-slate-500 text-xs leading-relaxed line-clamp-3">
                                    {oc.descricao}
                                </p>
                            </div>

                            <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest truncate max-w-[120px]">
                                        {oc.userName}
                                    </span>
                                    {oc.unitId && (
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">UNIDADE {oc.unitId}</span>
                                    )}
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-1">
                                        <Calendar size={10} className="text-slate-300" />
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(oc.dataAbertura).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock size={10} className="text-slate-300" />
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(oc.dataAbertura).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </div>
                        </HabitaCard>
                    ))
                )}
            </div>

            {/* Modal: Nova Ocorrência */}
            <HabitaModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingOcorrencia ? 'Editar Ocorrência' : 'Nova Ocorrência'}
                size="lg"
                footer={(
                    <div className="flex gap-4 w-full">
                        <HabitaButton variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving} className="flex-1">Cancelar</HabitaButton>
                        <HabitaButton 
                            onClick={handleSave} 
                            variant="primary" 
                            isLoading={isSaving}
                            className="flex-[2] bg-amber-600 border-amber-600 hover:bg-amber-700"
                        >
                            {editingOcorrencia ? 'Salvar Alterações' : 'Registrar Ocorrência'}
                        </HabitaButton>
                    </div>
                )}
            >
                <form className="space-y-6">
                    <HabitaInput
                        label="Título do Problema"
                        value={formData.titulo}
                        onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                        placeholder="Ex: Vazamento no corredor"
                        required
                    />

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <HabitaCombobox
                                label="Categoria"
                                options={CATEGORIAS.map(cat => ({ label: cat, value: cat }))}
                                value={formData.categoria}
                                onChange={val => setFormData({ ...formData, categoria: val })}
                                placeholder="Selecione a categoria..."
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioridade</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['Baixa', 'Média', 'Alta'] as const).map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, prioridade: p })}
                                        className={cn(
                                            "h-12 rounded-xl border font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1",
                                            formData.prioridade === p
                                                ? (p === 'Alta' ? 'bg-rose-50 border-rose-500 text-rose-600 shadow-sm' : p === 'Média' ? 'bg-amber-50 border-amber-500 text-amber-600 shadow-sm' : 'bg-emerald-50 border-emerald-500 text-emerald-600 shadow-sm')
                                                : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                        )}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <HabitaTextarea
                        label="Descrição Detalhada"
                        value={formData.descricao}
                        onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                        placeholder="Descreva o ocorrido com o máximo de detalhes possível..."
                        rows={5}
                        required
                    />

                    <div className="space-y-4">
                        <HabitaFileUpload
                            label="Documentação Fotográfica"
                            description="Regra de Ouro: Máximo 500KB. Largura 1280px."
                            accept="image/*"
                            onFilesSelected={async (files) => {
                                if (files.length > 0) {
                                    let file = files[0];
                                    
                                    // Handle HEIC/HEIF format (iPhone images)
                                    const extension = file.name.split('.').pop()?.toLowerCase();
                                    if (extension === 'heic' || extension === 'heif') {
                                        try {
                                            const convertedBlob = await heic2any({
                                                blob: file,
                                                toType: 'image/jpeg',
                                                quality: 0.8
                                            });
                                            
                                            const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                                            file = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
                                                type: 'image/jpeg'
                                            });
                                        } catch (err) {
                                            console.error("HEIC conversion failed:", err);
                                            showToast('Erro ao converter imagem do iPhone. Tente converter para JPG antes de subir.', 'error');
                                            return;
                                        }
                                    }

                                    setPhotoFile(file);
                                    const reader = new FileReader();
                                    reader.onloadend = () => setPhotoPreview(reader.result as string);
                                    reader.readAsDataURL(file);
                                }
                            }}
                            isLoading={isSaving}
                            variant="button"
                        />
                        
                        {photoPreview && (
                            <HabitaCard className="flex items-center gap-4 p-3 border-amber-200 bg-amber-50/30 overflow-hidden animate-in zoom-in-95 duration-300">
                                <div className="w-16 h-16 rounded-xl overflow-hidden border border-amber-200 shadow-sm relative group">
                                    <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" />
                                    {isSaving && (
                                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                            <HabitaSpinner size="xs" variant="primary" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Imagem Selecionada</p>
                                    <p className="text-[9px] text-amber-500 font-bold truncate max-w-[150px]">
                                        {photoFile?.name || 'Arquivo existente'}
                                    </p>
                                </div>
                                <HabitaButton 
                                    size="sm" 
                                    variant="ghost" 
                                    className="text-rose-600 hover:bg-rose-50 h-8 font-black text-[9px] uppercase tracking-widest"
                                    onClick={removePhoto}
                                    disabled={isSaving}
                                    icon={<X size={12} />}
                                >
                                    Remover
                                </HabitaButton>
                            </HabitaCard>
                        )}
                    </div>
                </form>
            </HabitaModal>

            {/* Modal: Detalhes da Ocorrência */}
            <HabitaModal
                isOpen={!!isDetailOpen}
                onClose={() => setIsDetailOpen(null)}
                title={isDetailOpen?.titulo || 'Detalhes da Ocorrência'}
                size="lg"
            >
                {isDetailOpen && (
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Relatado por</h4>
                            <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-bold text-slate-800 shadow-sm border border-slate-100 uppercase">
                                    {isDetailOpen.userName?.charAt(0) || profile?.name?.charAt(0) || 'H'}
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{isDetailOpen.userName || 'Habitante'}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Unidade: {isDetailOpen.unitId || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <HabitaBadge 
                                variant={isDetailOpen.prioridade === 'Alta' ? 'error' : isDetailOpen.prioridade === 'Média' ? 'warning' : 'success'}
                            >
                                {(isDetailOpen.prioridade || 'Baixa').toUpperCase()}
                            </HabitaBadge>
                            <HabitaBadge variant="neutral">
                                {isDetailOpen.categoria.toUpperCase()}
                            </HabitaBadge>
                            <div className="flex items-center gap-3 ml-auto">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-r border-slate-200 pr-3">
                                    <Calendar size={12} /> {new Date(isDetailOpen.dataAbertura).toLocaleDateString('pt-BR')}
                                </span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Clock size={12} /> {new Date(isDetailOpen.dataAbertura).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>

                        {isDetailOpen.photoUrl && (
                            <div className="w-full">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Registro Fotográfico</h4>
                                <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-lg border border-slate-100 group">
                                    <HeicImage 
                                        src={isDetailOpen.photoUrl} 
                                        alt={isDetailOpen.titulo} 
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-4 right-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                        <HabitaButton 
                                            variant="ghost" 
                                            className="bg-white/90 backdrop-blur-md shadow-xl hover:bg-white"
                                            onClick={() => setFullScreenImage(isDetailOpen.photoUrl!)}
                                            icon={<ImageIcon size={14} />}
                                        >
                                            Ver Tamanho Real
                                        </HabitaButton>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Resumo do Relato</h4>
                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-600 text-sm leading-relaxed font-bold whitespace-pre-wrap">
                                    {isDetailOpen.descricao}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Status Atual</h4>
                                    <div className="flex items-center gap-4">
                                        <HabitaBadge 
                                            variant={(isDetailOpen.status === 'Resolvida' || isDetailOpen.status === 'Fechado') ? 'success' : 'warning'}
                                            className="h-10 px-6"
                                        >
                                            {isDetailOpen.status.toUpperCase()}
                                        </HabitaBadge>
                                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                            <div className={cn(
                                                "h-full transition-all duration-1000",
                                                isDetailOpen.status === 'Resolvida' ? "w-full bg-emerald-500" : "w-1/3 bg-amber-500 animate-pulse"
                                            )} />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Ações Disponíveis</h4>
                                    <div className="flex flex-col gap-3">
                                        {(isAdmin || isOperator) && (
                                            <HabitaButton
                                                onClick={async () => {
                                                    try {
                                                        const target = isDetailOpen!;
                                                        const isClosed = target.status === 'Resolvida' || target.status === 'Fechado';
                                                        const novoStatus = isClosed ? 'Pendente' : 'Resolvida';
                                                        const updated: Ocorrencia = {
                                                            ...target,
                                                            status: novoStatus as any,
                                                            dataResolucao: !isClosed ? new Date().toISOString() : undefined
                                                        };
                                                        await updateOcorrencia(updated);
                                                        setIsDetailOpen(updated);
                                                        showToast('Status atualizado!', 'success');
                                                    } catch (error) {
                                                        showToast('Erro ao atualizar status.', 'error');
                                                    }
                                                }}
                                                variant="primary"
                                                className={cn(
                                                    "w-full h-12",
                                                    isDetailOpen.status === 'Resolvida' ? "bg-slate-900 border-slate-900" : "bg-emerald-600 border-emerald-600 hover:bg-emerald-700"
                                                )}
                                                icon={isDetailOpen.status === 'Resolvida' ? <Clock size={18} /> : <CheckCircle2 size={18} />}
                                            >
                                                {isDetailOpen.status === 'Resolvida' ? 'Reabrir Ocorrência' : 'Marcar como Resolvido'}
                                            </HabitaButton>
                                        )}
                                        <HabitaButton onClick={() => setIsDetailOpen(null)} variant="outline" className="w-full h-12">Fechar</HabitaButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </HabitaModal>

            {/* Modal: Visualização em Tamanho Real */}
            <HabitaModal
                isOpen={!!fullScreenImage}
                onClose={() => setFullScreenImage(null)}
                title="Visualização da Imagem"
                size="full"
            >
                {fullScreenImage && (
                    <div className="flex flex-col items-center justify-center min-h-[70vh]">
                        <div className="relative max-w-5xl w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-100">
                            <HeicImage 
                                src={fullScreenImage} 
                                alt="Visualização em tamanho real" 
                                className="w-full h-auto object-contain max-h-[85vh]"
                            />
                            <div className="absolute top-4 right-4 capitalize">
                                <HabitaButton 
                                    variant="ghost" 
                                    className="bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm px-4"
                                    onClick={() => setFullScreenImage(null)}
                                    icon={<X size={18} />}
                                >
                                    Fechar
                                </HabitaButton>
                            </div>
                        </div>
                    </div>
                )}
            </HabitaModal>

            {/* Modal: Confirmação de Exclusão */}
            <HabitaModal
                isOpen={!!isDeleting}
                onClose={() => setIsDeleting(null)}
                title="Confirmar Exclusão"
                size="sm"
            >
                <div className="text-center space-y-6">
                    <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
                        <Trash2 size={32} />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Deseja excluir este registro?</h4>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed px-4">Esta ação removerá permanentemente a ocorrência da base de dados.</p>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <HabitaButton variant="outline" onClick={() => setIsDeleting(null)} className="flex-1">Cancelar</HabitaButton>
                        <HabitaButton 
                            variant="danger" 
                            onClick={confirmDelete} 
                            className="flex-1"
                        >
                            Excluir
                        </HabitaButton>
                    </div>
                </div>
            </HabitaModal>
            </HabitaCard>
        </div>
    );
}

export default OcorrenciasPage;
