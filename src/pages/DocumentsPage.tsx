import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import type { CondoDocument } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { uploadFile } from '../utils/FirebaseUtils';
import { FileText, Plus, Trash2, Search, Eye, Download } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

// Habita Design System
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaTable, HabitaTBody, HabitaTD, HabitaTH, HabitaTHead, HabitaTR } from '../components/ui/HabitaTable';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaInput, HabitaTextarea } from '../components/ui/HabitaForm';
import { HabitaCombobox, type HabitaOption } from '../components/ui/HabitaCombobox';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { HabitaIconActionButton } from '../components/ui/HabitaIconActionButton';
import { HabitaFileUpload } from '../components/ui/HabitaFileUpload';


export function DocumentsPage() {

    const { documents, addDocument, deleteDocument, tenantId } = useApp();
    const { isAdmin } = useAuth();
    const canManageDocuments = isAdmin;
    const { showToast } = useToast();

    // Local State
    const [isUploading, setIsUploading] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<string>('ata');
    const [file, setFile] = useState<File | null>(null);
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showUploadForm, setShowUploadForm] = useState(false);

    // Delete Confirmation State
    const [docToDelete, setDocToDelete] = useState<CondoDocument | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const categoryOptions: HabitaOption[] = [
        { value: 'ata', label: 'Ata de Assembleia' },
        { value: 'regimento', label: 'Regimento / Convenção' },
        { value: 'aviso', label: 'Comunicado / Aviso' },
        { value: 'outro', label: 'Outros' }
    ];

    const filterOptions: HabitaOption[] = [
        { value: 'all', label: 'Todas as Categorias' },
        ...categoryOptions
    ];

    const handleUpload = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!title || !file) {
            showToast('Preencha o título e selecione um arquivo.', 'warning');
            return;
        }

        setIsUploading(true);
        try {
            const docId = crypto.randomUUID();
            const timestamp = Date.now();
            const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const storagePath = `condominios/${tenantId}/documentos/${timestamp}_${safeName}`;

            const fileUrl = await uploadFile(file, storagePath);
            const newDoc: CondoDocument = {
                id: docId,
                title,
                description,
                category: category as CondoDocument['category'],
                fileUrl,
                fileName: file.name,
                createdAt: new Date().toISOString(),
            };

            await addDocument(newDoc);
            showToast('Documento publicado com sucesso!', 'success');

            // Reset Form
            setTitle('');
            setDescription('');
            setCategory('ata');
            setFile(null);
            setShowUploadForm(false);
        } catch (error: any) {
            console.error("Error uploading document:", error);
            showToast(error.message || "Erro ao enviar documento.", 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const filteredDocs = documents.filter(doc => {
        const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
        const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const getCategoryVariant = (cat: CondoDocument['category']): "indigo" | "success" | "warning" | "error" | "neutral" => {
        const variants: Record<string, "indigo" | "success" | "warning" | "error" | "neutral"> = {
            ata: 'indigo',
            regimento: 'success',
            aviso: 'warning',
            outro: 'neutral'
        };
        return variants[cat] || 'neutral';
    };

    const getCategoryLabel = (cat: CondoDocument['category']) => {
        return categoryOptions.find(opt => opt.value === cat)?.label || 'Outros';
    };

    return (
        <div className="w-full animate-in fade-in duration-500 pb-16">
            <HabitaContainer>
                <HabitaContainerHeader 
                    title="Central de Documentos"
                    subtitle="Repositório Oficial de Documentos e Atas do Condomínio"
                    icon={<FileText size={24} />}
                    actions={
                        canManageDocuments && (
                            <HabitaButton
                                onClick={() => setShowUploadForm(true)}
                                icon={<Plus size={18} />}
                                className="bg-slate-900 border-slate-900 shadow-lg shadow-slate-200"
                            >
                                Publicar Documento
                            </HabitaButton>
                        )
                    }
                />

                <HabitaContainerContent padding="none">
                    <div className="flex-1 flex flex-col">
                    {/* Filtros Internos */}
                    <div className="p-5 border-b border-slate-100 bg-white flex flex-col md:flex-row items-center gap-4">
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors z-10" size={16} />
                            <HabitaInput
                                placeholder="Pesquisar por título ou descrição..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-11 bg-slate-50 border-slate-200 transition-all focus:bg-white"
                                containerClassName="w-full"
                            />
                        </div>

                        <div className="w-full md:w-64">
                            <HabitaCombobox
                                options={filterOptions}
                                value={filterCategory}
                                onChange={(val) => setFilterCategory(val)}
                                className="h-11 border-slate-200"
                                containerClassName="w-full"
                            />
                        </div>
                    </div>

                    {/* Tabela de Documentos */}
                    <div className="overflow-x-auto">
                        <HabitaTable 
                            headers={['Data', 'Documento / Título', 'Categoria', 'Ações']}
                            responsive
                            mobileVariant="list"
                            isEmpty={filteredDocs.length === 0}
                            emptyMessage="Nenhum documento localizado no repositório."
                            containerClassName="border-none rounded-none shadow-none"
                        >
                            <HabitaTHead>
                                <HabitaTR>
                                    <HabitaTH className="w-32 text-center">Data</HabitaTH>
                                    <HabitaTH>Título / Assunto</HabitaTH>
                                    <HabitaTH className="w-48 text-center">Referência</HabitaTH>
                                    <HabitaTH className="w-32 text-center">Ações</HabitaTH>
                                </HabitaTR>
                            </HabitaTHead>
                            <HabitaTBody>
                                {filteredDocs.map((doc: CondoDocument) => (
                                    <HabitaTR key={doc.id} className="group">
                                        <HabitaTD label="Data" className="font-bold text-slate-400 text-center font-mono">
                                            {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                                        </HabitaTD>
                                        <HabitaTD label="Documento">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-800 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                                                    {doc.title}
                                                </span>
                                                {doc.description && (
                                                    <span className="text-[10px] text-slate-400 font-medium leading-relaxed italic mt-1">{doc.description}</span>
                                                )}
                                            </div>
                                        </HabitaTD>
                                        <HabitaTD label="Categoria" className="text-center">
                                            <HabitaBadge variant={getCategoryVariant(doc.category)} size="xs">
                                                {getCategoryLabel(doc.category)}
                                            </HabitaBadge>
                                        </HabitaTD>
                                        <HabitaTD label="Ações" className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <HabitaIconActionButton
                                                    icon={<Eye />}
                                                    variant="ghost"
                                                    size="sm"
                                                    tooltip="Visualizar"
                                                    className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                                                    onClick={() => window.open(doc.fileUrl, '_blank')}
                                                />
                                                <HabitaIconActionButton
                                                    icon={<Download />}
                                                    variant="ghost"
                                                    size="sm"
                                                    tooltip="Download"
                                                    className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                                                    onClick={() => {
                                                        const link = document.createElement('a');
                                                        link.href = doc.fileUrl;
                                                        link.download = doc.fileName;
                                                        link.target = '_blank';
                                                        document.body.appendChild(link);
                                                        link.click();
                                                        document.body.removeChild(link);
                                                    }}
                                                />
                                                {canManageDocuments && (
                                                    <HabitaIconActionButton
                                                        icon={<Trash2 />}
                                                        variant="ghost"
                                                        size="sm"
                                                        tooltip="Excluir"
                                                        className="text-rose-600 bg-rose-50 hover:bg-rose-100"
                                                        onClick={() => setDocToDelete(doc)}
                                                    />
                                                )}
                                            </div>
                                        </HabitaTD>
                                    </HabitaTR>
                                ))}
                            </HabitaTBody>
                        </HabitaTable>
                    </div>
                    </div>
                </HabitaContainerContent>
            </HabitaContainer>

            {/* Modal: Upload Form */}
            <HabitaModal
                isOpen={showUploadForm}
                onClose={() => setShowUploadForm(false)}
                title="Novo Documento Oficial"
                size="lg"
                footer={
                    <div className="flex gap-3 w-full justify-end">
                        <HabitaButton variant="outline" onClick={() => setShowUploadForm(false)}>
                            Descartar
                        </HabitaButton>
                        <HabitaButton
                            onClick={() => handleUpload()}
                            isLoading={isUploading}
                            className="bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-100"
                            icon={<Plus size={18} />}
                        >
                            Publicar Documento
                        </HabitaButton>
                    </div>
                }
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <HabitaInput
                            label="Título / Assunto"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ex: Ata da Assembleia Geral..."
                            required
                        />
                        <HabitaCombobox
                            label="Rubrica / Categoria"
                            options={categoryOptions}
                            value={category}
                            onChange={(val) => setCategory(val)}
                            className="border-slate-200"
                        />
                    </div>
                    
                    <HabitaTextarea
                        label="Observações Adicionais"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Breve descrição do conteúdo..."
                        className="min-h-[100px]"
                    />

                    <HabitaFileUpload
                        label="Arquivo Vinculado (PDF / Imagem)"
                        value={file ? [file] : []}
                        onFilesSelected={files => setFile(files.length > 0 ? files[0] : null)}
                        accept="application/pdf,image/*"
                    />
                </div>
            </HabitaModal>

            {/* Modal: Confirm Deletion */}
            <HabitaModal
                isOpen={!!docToDelete}
                onClose={() => setDocToDelete(null)}
                title="Excluir Documento"
                size="sm"
            >
                <div className="text-center space-y-6">
                    <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100 shadow-sm">
                        <Trash2 size={32} />
                    </div>
                    <div>
                        <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Confirmar Exclusão?</h4>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed px-4 mt-2">
                            Você está prestes a remover o documento <strong className="text-slate-600">"{docToDelete?.title}"</strong> permanentemente. 
                            Esta ação não pode ser desfeita.
                        </p>
                    </div>
                    <div className="flex gap-3 pt-4 w-full">
                        <HabitaButton variant="outline" onClick={() => setDocToDelete(null)} className="flex-1">
                            Manter
                        </HabitaButton>
                        <HabitaButton 
                            variant="danger" 
                            isLoading={isDeleting}
                            onClick={async () => {
                                if (!docToDelete) return;
                                setIsDeleting(true);
                                try {
                                    await deleteDocument(docToDelete.id);
                                    showToast('Documento removido com sucesso!', 'success');
                                    setDocToDelete(null);
                                } catch (error) {
                                    showToast('Erro ao remover documento.', 'error');
                                } finally {
                                    setIsDeleting(false);
                                }
                            }}
                            className="flex-1"
                        >
                            Confirmar
                        </HabitaButton>
                    </div>
                </div>
            </HabitaModal>
        </div>
    );
}
