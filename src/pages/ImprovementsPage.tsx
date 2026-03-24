import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import type { BuildingImprovement } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { uploadFile, deleteFileFromStorage } from '../utils/FirebaseUtils';
import {
    History, Plus, Trash2, Calendar, FileText,
    Search, ExternalLink, Pencil, Upload
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Habita Design System
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaInput, HabitaTextarea } from '../components/ui/HabitaForm';
import { HabitaCombobox, type HabitaOption } from '../components/ui/HabitaCombobox';
import { HabitaDatePicker } from '../components/ui/HabitaDatePicker';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { HabitaIconActionButton } from '../components/ui/HabitaIconActionButton';
import { HabitaFileUpload } from '../components/ui/HabitaFileUpload';
import { HabitaHeading } from '../components/ui/HabitaHeading';
import { HabitaStatGrid } from '../components/ui/HabitaStatGrid';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ImprovementsPage() {
    const { improvements, addImprovement, updateImprovement, deleteImprovement, tenantId } = useApp();
    const { isAdmin } = useAuth();
    const { showToast } = useToast();

    // UI state
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
    const [existingDoc, setExistingDoc] = useState<string | undefined>(undefined);
    const [removedPhotos, setRemovedPhotos] = useState<string[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        description: '',
    });
    const [photoFiles, setPhotoFiles] = useState<File[]>([]);
    const [docFile, setDocFile] = useState<File | null>(null);

    const sortOptions: HabitaOption[] = [
        { value: 'date', label: 'Ordem Cronológica' },
        { value: 'amount', label: 'Maior Investimento' }
    ];

    const handleFileUploads = async (obraId: string) => {
        const photoUrls: string[] = [];
        let documentUrl = '';

        for (const file of photoFiles) {
            const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const path = `condominios/${tenantId}/obras/${obraId}/${Date.now()}_${safeName}`;
            const url = await uploadFile(file, path);
            photoUrls.push(url);
        }

        if (docFile) {
            const safeName = docFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const path = `condominios/${tenantId}/obras/${obraId}/${Date.now()}_${safeName}`;
            documentUrl = await uploadFile(docFile, path);
        }

        return { photoUrls, documentUrl };
    };

    const handleEdit = (imp: BuildingImprovement) => {
        setFormData({
            title: imp.title,
            date: imp.date,
            amount: imp.amount,
            description: imp.description,
        });
        setExistingPhotos(imp.photoUrls || []);
        setExistingDoc(imp.documentUrl);
        setEditingId(imp.id);
        setIsModalOpen(true);
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        const currentCount = existingPhotos.length;
        const newCount = photoFiles.length;
        if (currentCount + newCount > 10) {
            showToast(`Limite de 10 fotos atingido.`, 'error');
            return;
        }

        setIsUploading(true);
        try {
            const obraId = editingId || crypto.randomUUID();
            const { photoUrls, documentUrl } = await handleFileUploads(obraId);

            if (editingId) {
                const updatedImprovement: BuildingImprovement = {
                    id: editingId,
                    ...formData,
                    photoUrls: [...existingPhotos, ...photoUrls],
                    documentUrl: documentUrl || existingDoc,
                    createdAt: improvements.find(i => i.id === editingId)?.createdAt || new Date().toISOString(),
                };
                await updateImprovement(updatedImprovement);

                if (removedPhotos.length > 0) {
                    await Promise.all(removedPhotos.map(url => deleteFileFromStorage(url)));
                }
                showToast('Melhoria atualizada com sucesso!', 'success');
            } else {
                const newImprovement: BuildingImprovement = {
                    id: crypto.randomUUID(),
                    ...formData,
                    photoUrls,
                    documentUrl: documentUrl || undefined,
                    createdAt: new Date().toISOString(),
                };
                await addImprovement(newImprovement);
                showToast('Nova melhoria registrada!', 'success');
            }

            setIsModalOpen(false);
            resetForm();
        } catch (error: any) {
            console.error("Error saving improvement:", error);
            showToast(error.message || "Erro ao salvar melhoria.", 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            date: new Date().toISOString().split('T')[0],
            amount: 0,
            description: '',
        });
        setPhotoFiles([]);
        setDocFile(null);
        setEditingId(null);
        setExistingPhotos([]);
        setExistingDoc(undefined);
        setRemovedPhotos([]);
    };

    const sortedImprovements = [...improvements]
        .filter(imp =>
            imp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            imp.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
            return b.amount - a.amount;
        });
    const totalInvestment = improvements.reduce((sum, imp) => sum + imp.amount, 0);
    const worksCount = improvements.length;
    const lastWorkDate = improvements.length > 0 
        ? new Date(Math.max(...improvements.map(i => new Date(i.date).getTime())))
        : null;

    return (
        <div className="w-full animate-in fade-in duration-500 pb-16">
            <HabitaContainer>
                <HabitaContainerHeader 
                    title="Memória do Condomínio"
                    subtitle="Obras, Melhorias e Valorização do Patrimônio"
                    icon={<History size={24} />}
                    iconVariant="emerald"
                    actions={
                        isAdmin && (
                            <HabitaButton
                                onClick={() => setIsModalOpen(true)}
                                icon={<Plus size={18} />}
                                className="bg-slate-900 border-slate-900 shadow-lg shadow-slate-200 px-8"
                            >
                                Registrar Obra
                            </HabitaButton>
                        )
                    }
                />

                <HabitaContainerContent>
                    {/* Summary Section */}
                    <div className="px-5 pt-8 md:px-12 md:pt-10 bg-slate-50/20">
                        <HabitaStatGrid
                            title="Resumo de Valorização"
                            icon={<History />}
                            metrics={[
                                {
                                    label: "INVESTIMENTO TOTAL",
                                    value: totalInvestment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                                    icon: <Plus />,
                                    variant: "emerald",
                                    subtext: "Acumulado Histórico"
                                },
                                {
                                    label: "OBRAS REGISTRADAS",
                                    value: worksCount,
                                    icon: <FileText />,
                                    variant: "indigo",
                                    subtext: "Melhorias Realizadas"
                                },
                                {
                                    label: "ÚLTIMA ATUALIZAÇÃO",
                                    value: lastWorkDate ? lastWorkDate.toLocaleDateString('pt-BR') : "Sem registros",
                                    icon: <Calendar />,
                                    variant: "amber",
                                    subtext: "Conclusão mais Recente"
                                }
                            ]}
                            cols={3}
                        />
                    </div>

                    {/* Filtros Internos */}
                    <div className="p-5 border-b border-slate-100 bg-white flex flex-col md:flex-row items-center gap-4">
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors z-10" size={16} />
                            <HabitaInput
                                placeholder="Pesquisar por obras, melhorias ou detalhes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-11 bg-slate-50 border-slate-200 transition-all focus:bg-white"
                                containerClassName="w-full"
                            />
                        </div>

                        <div className="w-full md:w-64">
                            <HabitaCombobox
                                options={sortOptions}
                                value={sortBy}
                                onChange={(val) => setSortBy(val)}
                                className="h-11 border-slate-200"
                                containerClassName="w-full"
                            />
                        </div>
                    </div>

                    {/* Timeline Content */}
                    <div className="p-5 md:p-12 relative flex-1 bg-slate-50/30">
                        {/* Vertical Line */}
                        <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-slate-100/80 -translate-x-1/2 hidden md:block" />

                        <div className="space-y-12 md:space-y-16 relative">
                            {sortedImprovements.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
                                    <History className="mx-auto text-slate-200 mb-4" size={64} />
                                    <h3 className="text-xl font-black text-slate-700 uppercase tracking-tight">Cápsula do Tempo Vazia</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">A história do prédio começa com o primeiro registro oficial.</p>
                                </div>
                            ) : (
                                sortedImprovements.map((imp, idx) => (
                                    <div key={imp.id} className={`flex flex-col md:flex-row items-center gap-8 md:gap-4 group ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                                        {/* Timeline Dot */}
                                        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-white text-emerald-600 border-4 border-slate-50 shadow-md items-center justify-center z-10 group-hover:scale-110 transition-transform">
                                            <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200 animate-pulse" />
                                        </div>

                                        {/* Card Lateral */}
                                        <div className="w-full md:w-[45%] bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 relative overflow-hidden group/item">
                                            <div className={cn(
                                                "absolute top-0 left-0 w-2 h-full transition-all group-hover/item:w-3",
                                                idx % 2 === 0 ? "bg-emerald-500" : "bg-indigo-500"
                                            )} />

                                            {isAdmin && (
                                                <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover/item:opacity-100 transition-all transform translate-y-2 group-hover/item:translate-y-0">
                                                    <HabitaIconActionButton
                                                        icon={<Pencil />}
                                                        variant="ghost"
                                                        size="md"
                                                        tooltip="Editar"
                                                        className="bg-slate-50 border-slate-100"
                                                        onClick={() => handleEdit(imp)}
                                                    />
                                                    <HabitaIconActionButton
                                                        icon={<Trash2 />}
                                                        variant="danger"
                                                        size="md"
                                                        tooltip="Excluir"
                                                        className="bg-slate-50 border-slate-100"
                                                        onClick={() => {
                                                            setIdToDelete(imp.id);
                                                            setIsDeleteModalOpen(true);
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            <div className="flex items-center gap-3 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                                <Calendar size={14} className="text-emerald-500" />
                                                <span>{new Date(imp.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                                            </div>

                                            <h3 className="text-xl font-black text-slate-800 mb-3 group-hover/item:text-emerald-600 transition-colors uppercase tracking-tight leading-tight pr-12">
                                                {imp.title}
                                            </h3>

                                            <p className="text-slate-500 text-sm leading-relaxed mb-6 font-medium">
                                                {imp.description}
                                            </p>

                                            <div className="flex flex-wrap items-center gap-3">
                                                <HabitaBadge variant="neutral" className="bg-slate-100 text-slate-800 font-mono text-sm py-1.5 px-4 rounded-xl border-none">
                                                    {imp.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </HabitaBadge>
                                                
                                                {imp.documentUrl && (
                                                    <HabitaButton
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => window.open(imp.documentUrl, '_blank')}
                                                        className="h-10 px-4 rounded-xl border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 flex gap-2 text-[10px] font-black uppercase tracking-widest"
                                                        icon={<FileText size={14} />}
                                                    >
                                                        Nota Fiscal
                                                    </HabitaButton>
                                                )}
                                            </div>

                                            {/* Photo Strip */}
                                            {imp.photoUrls && imp.photoUrls.length > 0 && (
                                                <div className="mt-8 pt-6 border-t border-slate-50 flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                                                    {imp.photoUrls.map((url, i) => (
                                                        <div key={i} className="flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative group/photo cursor-pointer">
                                                            <img src={url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover/photo:scale-110" />
                                                            <div 
                                                                onClick={() => window.open(url, '_blank')}
                                                                className="absolute inset-0 bg-indigo-900/40 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-all duration-300"
                                                            >
                                                                <ExternalLink size={18} className="text-white transform scale-50 group-hover/photo:scale-100 transition-transform" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Espaçador Mobile/Desktop reversível */}
                                        <div className="hidden md:block w-[45%]" />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </HabitaContainerContent>
            </HabitaContainer>

            {/* Modal de Cadastro/Edição */}
            <HabitaModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); resetForm(); }}
                title={editingId ? 'Editar Registro de Obra' : 'Nova Melhoria Estrutural'}
                size="lg"
                footer={
                    <div className="flex gap-4 w-full">
                        <HabitaButton variant="outline" className="flex-1" onClick={() => { setIsModalOpen(false); resetForm(); }}>
                            Descartar
                        </HabitaButton>
                        <HabitaButton
                            onClick={() => handleSave()}
                            isLoading={isUploading}
                            className="flex-[2] bg-emerald-600 border-emerald-600 shadow-xl shadow-emerald-100"
                            icon={<Upload size={18} />}
                        >
                            {editingId ? 'Salvar Alterações' : 'Finalizar Registro'}
                        </HabitaButton>
                    </div>
                }
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <HabitaInput
                            label="Título da Obra / Melhoria"
                            placeholder="Ex: Reforma da Fachada..."
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            required
                            containerClassName="md:col-span-2"
                        />
                        
                        <HabitaDatePicker
                            label="Data de Conclusão"
                            value={formData.date ? new Date(formData.date + 'T12:00:00') : undefined}
                            onChange={(date: Date) => setFormData({ ...formData, date: date.toISOString().split('T')[0] })}
                        />

                        <HabitaInput
                            label="Investimento (R$)"
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                            required
                        />
                    </div>

                    <HabitaTextarea
                        label="Descrição Detalhada e Insumos"
                        placeholder="Quais melhorias foram feitas? Quais materiais utilizados?..."
                        rows={4}
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        required
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Photos Upload */}
                        <HabitaFileUpload
                            label={`Registros Fotográficos ${editingId ? '(Novos)' : ''}`}
                            value={photoFiles}
                            onFilesSelected={setPhotoFiles}
                            multiple
                            accept="image/*"
                            description="Selecione até 10 fotos da obra"
                        />

                        {editingId && existingPhotos.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fotos Existentes</label>
                                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    {existingPhotos.map((url, i) => (
                                        <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 group/exist shadow-sm">
                                            <img src={url} alt="" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const url = existingPhotos[i];
                                                    setRemovedPhotos(prev => [...prev, url]);
                                                    setExistingPhotos(prev => prev.filter((_, idx) => idx !== i));
                                                }}
                                                className="absolute inset-0 bg-rose-500/80 text-white flex items-center justify-center opacity-0 group-hover/exist:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Document Upload */}
                        <HabitaFileUpload
                            label={`Documentação / NF ${editingId ? '(Novo)' : ''}`}
                            value={docFile ? [docFile] : []}
                            onFilesSelected={files => setDocFile(files.length > 0 ? files[0] : null)}
                            accept="application/pdf"
                            description={existingDoc ? "Já existe um PDF vinculado" : "Anexar nota fiscal ou contrato"}
                        />
                    </div>
                </div>
            </HabitaModal>

            {/* Modal de Confirmação de Exclusão */}
            <HabitaModal
                isOpen={isDeleteModalOpen}
                onClose={() => { setIsDeleteModalOpen(false); setIdToDelete(null); }}
                title="Excluir Registro?"
                size="sm"
                footer={
                    <div className="flex gap-3 w-full sm:w-auto">
                        <HabitaButton variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                            Manter Registro
                        </HabitaButton>
                        <HabitaButton 
                            variant="danger" 
                            onClick={async () => {
                                if (idToDelete) {
                                    await deleteImprovement(idToDelete);
                                    setIsDeleteModalOpen(false);
                                    setIdToDelete(null);
                                    showToast('Registro excluído com sucesso.', 'success');
                                }
                            }}
                            icon={<Trash2 size={16} />}
                        >
                            Confirmar Exclusão
                        </HabitaButton>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-rose-100">
                        <Trash2 size={32} />
                    </div>
                    <HabitaHeading level={3} className="text-slate-800 mb-2">Tem Certeza?</HabitaHeading>
                    <p className="text-slate-500 text-xs leading-relaxed">
                        Você está prestes a excluir este registro da <span className="font-bold text-slate-700">Memória do Condomínio</span> permanentemente. Esta ação não poderá ser desfeita.
                    </p>
                </div>
            </HabitaModal>
        </div>
    );
}
