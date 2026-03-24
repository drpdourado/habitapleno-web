import { useState } from 'react';
import { useCategories } from '../hooks/useCategories';
import { useAuth } from '../contexts/AuthContext';
import { 
    Plus, 
    Trash2, 
    Edit2, 
    Check, 
    X, 
    Tag, 
    ArrowUpCircle, 
    ArrowDownCircle, 
    ShieldAlert, 
    Info,
    Settings
} from 'lucide-react';
import type { Category } from '../contexts/AppContext';
import { hasPermission } from '../utils/rbac';
import { useNotification } from '../contexts/NotificationContext';

// Habita Design System
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaInput } from '../components/ui/HabitaForm';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaTable, HabitaTHead, HabitaTBody, HabitaTR, HabitaTH, HabitaTD } from '../components/ui/HabitaTable';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { HabitaIconActionButton } from '../components/ui/HabitaIconActionButton';
import { HabitaSpinner } from '../components/ui/HabitaSpinner';

export function CategoriesPage() {
    const { accessProfile } = useAuth();
    const { showToast } = useNotification();
    const canManageCategories = hasPermission(accessProfile, 'categories', 'all');
    const {
        incomeCategories,
        expenseCategories,
        isLoading,
        addCategory,
        updateCategory,
        deleteCategory
    } = useCategories();

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', type: 'expense' as 'income' | 'expense' });
    const [editName, setEditName] = useState('');

    if (!canManageCategories) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh] space-y-6">
                <div className="w-20 h-20 bg-rose-50 text-rose-400 rounded-3xl flex items-center justify-center shadow-sm">
                    <ShieldAlert size={40} />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Acesso Restrito</h2>
                    <p className="text-slate-500 text-sm font-medium mt-2">Você não possui as permissões necessárias para gerenciar o catálogo de rubricas.</p>
                </div>
                <HabitaButton variant="outline" onClick={() => window.history.back()}>Voltar</HabitaButton>
            </div>
        );
    }

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;
        try {
            await addCategory(formData.name, formData.type);
            setFormData({ name: '', type: 'expense' });
            setIsAdding(false);
            showToast('Rúbrica cadastrada com sucesso!', 'success');
        } catch (error) {
            console.error(error);
            showToast('Erro ao cadastrar rúbrica.', 'error');
        }
    };

    const handleSaveEdit = async (category: Category) => {
        if (!editName) return;
        try {
            await updateCategory({ ...category, name: editName });
            setEditingId(null);
            showToast('Rúbrica atualizada com sucesso!', 'success');
        } catch (error) {
            console.error(error);
            showToast('Erro ao atualizar rúbrica.', 'error');
        }
    };

    const startEditing = (category: Category) => {
        setEditingId(category.id);
        setEditName(category.name);
    };


    return (
        <div className="w-full animate-in fade-in duration-700 pb-12">
            <HabitaContainer>
                <HabitaContainerHeader 
                    title="Catálogo de Rúbricas"
                    subtitle="Padronização de Naturezas e Categorias Financeiras"
                    icon={<Tag size={24} />}
                    actions={
                        <HabitaButton
                            variant="primary"
                            onClick={() => setIsAdding(true)}
                            icon={<Plus size={18} />}
                            className="bg-slate-900 border-slate-900 shadow-lg shadow-slate-200 px-8 h-12 rounded-2xl"
                        >
                            Nova Rúbrica
                        </HabitaButton>
                    }
                />

                <HabitaContainerContent padding="md">

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 space-y-4">
                        <HabitaSpinner size="lg" variant="primary" showLabel label="Carregando Catálogo..." />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Revenues Column */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Receitas e Entradas
                                </h3>
                                <HabitaBadge variant="success" size="xs">{incomeCategories.length} Itens</HabitaBadge>
                            </div>
                            
                            <HabitaTable
                                responsive
                                mobileVariant="list"
                                isEmpty={incomeCategories.length === 0}
                                emptyMessage="Nenhuma receita cadastrada."
                                containerClassName="border border-slate-100 rounded-2xl overflow-hidden shadow-none"
                            >
                                <HabitaTHead>
                                    <HabitaTR>
                                        <HabitaTH>Rúbrica</HabitaTH>
                                        <HabitaTH className="text-right">Ações</HabitaTH>
                                    </HabitaTR>
                                </HabitaTHead>
                                <HabitaTBody>
                                    {incomeCategories.map(cat => (
                                        <HabitaTR key={cat.id} className="group">
                                            {/* Layout Mobile */}
                                            <HabitaTD responsive={false} className="md:hidden block py-2.5 px-4 w-full">
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex-1 min-w-0">
                                                        {editingId === cat.id ? (
                                                            <HabitaInput
                                                                autoFocus
                                                                value={editName}
                                                                onChange={e => setEditName(e.target.value)}
                                                                className="h-9 font-black text-slate-800 uppercase tracking-tight"
                                                                onKeyDown={e => e.key === 'Enter' && handleSaveEdit(cat)}
                                                            />
                                                        ) : (
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                                                                    <ArrowUpCircle size={16} />
                                                                </div>
                                                                <span className="font-black text-slate-800 text-xs uppercase tracking-tight truncate">{cat.name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1.5 ml-3 shrink-0">
                                                        {editingId === cat.id ? (
                                                            <>
                                                                <HabitaIconActionButton
                                                                    icon={<Check />}
                                                                    variant="success"
                                                                    size="sm"
                                                                    tooltip="Salvar"
                                                                    onClick={() => handleSaveEdit(cat)}
                                                                />
                                                                <HabitaIconActionButton
                                                                    icon={<X />}
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    tooltip="Cancelar"
                                                                    className="text-slate-400"
                                                                    onClick={() => setEditingId(null)}
                                                                />
                                                            </>
                                                        ) : (
                                                            <>
                                                                <HabitaIconActionButton
                                                                    icon={<Edit2 />}
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    tooltip="Editar"
                                                                    className="text-slate-400"
                                                                    onClick={() => startEditing(cat)}
                                                                />
                                                                <HabitaIconActionButton
                                                                    icon={<Trash2 />}
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    tooltip="Excluir"
                                                                    className="text-slate-400"
                                                                    onClick={async () => {
                                                                        try {
                                                                            await deleteCategory(cat.id);
                                                                            showToast('Rúbrica removida!', 'success');
                                                                        } catch (e) {
                                                                            console.error(e);
                                                                            showToast('Erro ao remover rúbrica.', 'error');
                                                                        }
                                                                    }}
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </HabitaTD>

                                            {/* Layout Desktop */}
                                            <HabitaTD className="hidden md:table-cell py-3">
                                                {editingId === cat.id ? (
                                                    <HabitaInput
                                                        autoFocus
                                                        value={editName}
                                                        onChange={e => setEditName(e.target.value)}
                                                        className="h-10 font-black text-slate-800 uppercase tracking-tight"
                                                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit(cat)}
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                                                            <ArrowUpCircle size={18} />
                                                        </div>
                                                        <span className="font-black text-slate-800 text-sm uppercase tracking-tight truncate">{cat.name}</span>
                                                    </div>
                                                )}
                                            </HabitaTD>
                                            <HabitaTD align="right" className="hidden md:table-cell py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    {editingId === cat.id ? (
                                                        <>
                                                            <HabitaIconActionButton
                                                                icon={<Check />}
                                                                variant="success"
                                                                size="sm"
                                                                tooltip="Salvar"
                                                                className="hover:bg-emerald-50"
                                                                onClick={() => handleSaveEdit(cat)}
                                                            />
                                                            <HabitaIconActionButton
                                                                icon={<X />}
                                                                variant="ghost"
                                                                size="sm"
                                                                tooltip="Cancelar"
                                                                className="text-slate-400 hover:bg-slate-50"
                                                                onClick={() => setEditingId(null)}
                                                            />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <HabitaIconActionButton
                                                                icon={<Edit2 />}
                                                                variant="ghost"
                                                                size="sm"
                                                                tooltip="Editar"
                                                                className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                                onClick={() => startEditing(cat)}
                                                            />
                                                            <HabitaIconActionButton
                                                                icon={<Trash2 />}
                                                                variant="ghost"
                                                                size="sm"
                                                                tooltip="Excluir"
                                                                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                                onClick={() => deleteCategory(cat.id)}
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            </HabitaTD>
                                        </HabitaTR>
                                    ))}
                                </HabitaTBody>
                            </HabitaTable>
                        </div>

                        {/* Expenses Column */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                                    Despesas e Saídas
                                </h3>
                                <HabitaBadge variant="error" size="xs">{expenseCategories.length} Itens</HabitaBadge>
                            </div>

                            <HabitaTable
                                responsive
                                mobileVariant="list"
                                isEmpty={expenseCategories.length === 0}
                                emptyMessage="Nenhuma despesa cadastrada."
                                containerClassName="border border-slate-100 rounded-2xl overflow-hidden shadow-none"
                            >
                                <HabitaTHead>
                                    <HabitaTR>
                                        <HabitaTH>Rúbrica</HabitaTH>
                                        <HabitaTH className="text-right">Ações</HabitaTH>
                                    </HabitaTR>
                                </HabitaTHead>
                                <HabitaTBody>
                                    {expenseCategories.map(cat => (
                                        <HabitaTR key={cat.id} className="group">
                                            {/* Layout Mobile */}
                                            <HabitaTD responsive={false} className="md:hidden block py-2.5 px-4 w-full">
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex-1 min-w-0">
                                                        {editingId === cat.id ? (
                                                            <HabitaInput
                                                                autoFocus
                                                                value={editName}
                                                                onChange={e => setEditName(e.target.value)}
                                                                className="h-9 font-black text-slate-800 uppercase tracking-tight"
                                                                onKeyDown={e => e.key === 'Enter' && handleSaveEdit(cat)}
                                                            />
                                                        ) : (
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                                                                    <ArrowDownCircle size={16} />
                                                                </div>
                                                                <span className="font-black text-slate-800 text-xs uppercase tracking-tight truncate">{cat.name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1.5 ml-3 shrink-0">
                                                        {editingId === cat.id ? (
                                                            <>
                                                                <HabitaIconActionButton
                                                                    icon={<Check />}
                                                                    variant="success"
                                                                    size="sm"
                                                                    tooltip="Salvar"
                                                                    onClick={() => handleSaveEdit(cat)}
                                                                />
                                                                <HabitaIconActionButton
                                                                    icon={<X />}
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    tooltip="Cancelar"
                                                                    className="text-slate-400"
                                                                    onClick={() => setEditingId(null)}
                                                                />
                                                            </>
                                                        ) : (
                                                            <>
                                                                <HabitaIconActionButton
                                                                    icon={<Edit2 />}
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    tooltip="Editar"
                                                                    className="text-slate-400"
                                                                    onClick={() => startEditing(cat)}
                                                                />
                                                                <HabitaIconActionButton
                                                                    icon={<Trash2 />}
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    tooltip="Excluir"
                                                                    className="text-slate-400"
                                                                    onClick={async () => {
                                                                        try {
                                                                            await deleteCategory(cat.id);
                                                                            showToast('Rúbrica removida!', 'success');
                                                                        } catch (e) {
                                                                            console.error(e);
                                                                            showToast('Erro ao remover rúbrica.', 'error');
                                                                        }
                                                                    }}
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </HabitaTD>

                                            {/* Layout Desktop */}
                                            <HabitaTD className="hidden md:table-cell py-3">
                                                {editingId === cat.id ? (
                                                    <HabitaInput
                                                        autoFocus
                                                        value={editName}
                                                        onChange={e => setEditName(e.target.value)}
                                                        className="h-10 font-black text-slate-800 uppercase tracking-tight"
                                                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit(cat)}
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                                                            <ArrowDownCircle size={18} />
                                                        </div>
                                                        <span className="font-black text-slate-800 text-sm uppercase tracking-tight truncate">{cat.name}</span>
                                                    </div>
                                                )}
                                            </HabitaTD>
                                            <HabitaTD align="right" className="hidden md:table-cell py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    {editingId === cat.id ? (
                                                        <>
                                                            <HabitaIconActionButton
                                                                icon={<Check />}
                                                                variant="success"
                                                                size="sm"
                                                                tooltip="Salvar"
                                                                className="hover:bg-emerald-50"
                                                                onClick={() => handleSaveEdit(cat)}
                                                            />
                                                            <HabitaIconActionButton
                                                                icon={<X />}
                                                                variant="ghost"
                                                                size="sm"
                                                                tooltip="Cancelar"
                                                                className="text-slate-400 hover:bg-slate-50"
                                                                onClick={() => setEditingId(null)}
                                                            />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <HabitaIconActionButton
                                                                icon={<Edit2 />}
                                                                variant="ghost"
                                                                size="sm"
                                                                tooltip="Editar"
                                                                className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                                onClick={() => startEditing(cat)}
                                                            />
                                                            <HabitaIconActionButton
                                                                icon={<Trash2 />}
                                                                variant="ghost"
                                                                size="sm"
                                                                tooltip="Excluir"
                                                                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                                onClick={() => deleteCategory(cat.id)}
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            </HabitaTD>
                                        </HabitaTR>
                                    ))}
                                </HabitaTBody>
                            </HabitaTable>
                        </div>
                    </div>
                )}
                </HabitaContainerContent>
            </HabitaContainer>

            {/* Info Banner */}
            <div className="bg-indigo-600 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-indigo-100 border border-indigo-500">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center text-white backdrop-blur-sm border border-white/20">
                        <Settings size={32} />
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-white uppercase tracking-tight leading-none">Inteligência Estrutural</h4>
                        <p className="text-indigo-100 text-sm font-medium mt-1">A organização das rúbricas impacta diretamente na precisão dos seus relatórios de DRE e Balancetes.</p>
                    </div>
                </div>
            </div>

            {/* Modal: Nova Categoria */}
            <HabitaModal
                isOpen={isAdding}
                onClose={() => setIsAdding(false)}
                title="Cadastrar Nova Rúbrica"
                size="md"
                footer={(
                    <div className="flex gap-4 w-full">
                        <HabitaButton variant="outline" onClick={() => setIsAdding(false)} className="flex-1">Cancelar</HabitaButton>
                        <HabitaButton onClick={handleAdd} variant="primary" className="flex-[2]" icon={<Check size={18} />}>Salvar Rúbrica</HabitaButton>
                    </div>
                )}
            >
                <form className="space-y-8" onSubmit={handleAdd}>
                    <div className="space-y-6">
                        <HabitaInput
                            label="Nome da Rúbrica"
                            placeholder="Ex: Água, Luz, Condomínio, etc."
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="font-black text-slate-800 uppercase tracking-tight"
                        />

                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider ml-1">Natureza da Operação</label>
                            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'expense' })}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        formData.type === 'expense' 
                                            ? "bg-white text-rose-600 shadow-md shadow-rose-100 border border-slate-200" 
                                            : "text-slate-400 hover:text-slate-600"
                                    }`}
                                >
                                    <ArrowDownCircle size={16} />
                                    Despesa / Saída
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'income' })}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        formData.type === 'income' 
                                            ? "bg-white text-emerald-600 shadow-md shadow-emerald-100 border border-slate-200" 
                                            : "text-slate-400 hover:text-slate-600"
                                    }`}
                                >
                                    <ArrowUpCircle size={16} />
                                    Receita / Entrada
                                </button>
                            </div>
                        </div>

                        <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-4">
                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                                <Info size={20} className="text-indigo-600" />
                            </div>
                            <p className="text-[11px] text-indigo-700 font-medium leading-relaxed">
                                Certifique-se de escolher a natureza correta. Rubricas de **Receita** aparecem na aba de Entradas, enquanto **Despesas** aparecem na aba de Gastos do painel financeiro.
                            </p>
                        </div>
                    </div>
                </form>
            </HabitaModal>
        </div>
    );
}
