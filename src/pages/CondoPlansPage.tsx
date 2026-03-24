import { useState, useEffect } from 'react';
import {
    Crown, Plus, Pencil, Trash2, Check,
    ShieldAlert, Puzzle, AlertCircle,
    CheckCircle2, ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { planService, type SaaSPlan } from '../services/PlanService';
import type { SystemModule } from '../utils/rbac';

// Habita Design System
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { HabitaCard } from '../components/ui/HabitaCard';
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaInput, HabitaCheckbox } from '../components/ui/HabitaForm';
import { HabitaSpinner } from '../components/ui/HabitaSpinner';

// ─── All system modules with display labels ─────────
const ALL_MODULES: { key: SystemModule; label: string; category: string }[] = [
    // Administração
    { key: 'history', label: 'Apuração', category: 'Administração' },
    { key: 'financial', label: 'Financeiro', category: 'Administração' },
    { key: 'closures', label: 'Encerramento', category: 'Administração' },
    { key: 'reports', label: 'Relatórios', category: 'Administração' },
    { key: 'categories', label: 'Rubricas', category: 'Administração' },
    { key: 'bank_accounts', label: 'Contas Bancárias', category: 'Administração' },
    { key: 'reconciliation', label: 'Conciliação', category: 'Administração' },
    // Operação
    { key: 'access', label: 'Portaria', category: 'Operação' },
    { key: 'ocorrencias', label: 'Ocorrências', category: 'Operação' },
    { key: 'gas', label: 'Medições (Gás)', category: 'Operação' },
    { key: 'units', label: 'Unidades', category: 'Operação' },
    { key: 'manutencoes', label: 'Manutenções', category: 'Operação' },
    { key: 'packages', label: 'Encomendas', category: 'Operação' },
    // Condomínio
    { key: 'mural', label: 'Mural', category: 'Condomínio' },
    { key: 'contact', label: 'Fale com o Síndico', category: 'Condomínio' },
    { key: 'polls', label: 'Assembleia Digital', category: 'Condomínio' },
    { key: 'documents', label: 'Documentos', category: 'Condomínio' },
    { key: 'improvements', label: 'Memória', category: 'Condomínio' },
    // Reservas
    { key: 'areas', label: 'Reservas', category: 'Reservas' },
    // Sistema
    { key: 'users', label: 'Usuários', category: 'Sistema' },
    { key: 'profiles', label: 'Perfis RBAC', category: 'Sistema' },
    { key: 'settings', label: 'Configurações', category: 'Sistema' },
];

const MODULE_CATEGORIES = ['Administração', 'Operação', 'Condomínio', 'Reservas', 'Sistema'];

export function CondoPlansPage() {
    const { isSuperAdmin, loading: authLoading } = useAuth();
    const { showToast } = useToast();

    const [plans, setPlans] = useState<SaaSPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<SaaSPlan | null>(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formPrice, setFormPrice] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formModules, setFormModules] = useState<Set<SystemModule>>(new Set());
    const [formIsDefault, setFormIsDefault] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Confirm modal
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'danger' as 'danger' | 'warning' | 'info'
    });

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        setLoading(true);
        const res = await planService.getAll();
        if (res.success && res.data) {
            setPlans(res.data);
        }
        setLoading(false);
    };

    const openCreateModal = () => {
        setEditingPlan(null);
        setFormName('');
        setFormPrice('');
        setFormDescription('');
        setFormModules(new Set());
        setFormIsDefault(false);
        setIsModalOpen(true);
    };

    const openEditModal = (plan: SaaSPlan) => {
        setEditingPlan(plan);
        setFormName(plan.name);
        setFormPrice(String(plan.price));
        setFormDescription(plan.description || '');
        setFormModules(new Set(plan.modules));
        setFormIsDefault(plan.isDefault || false);
        setIsModalOpen(true);
    };

    const toggleModule = (mod: SystemModule) => {
        setFormModules(prev => {
            const next = new Set(prev);
            if (next.has(mod)) {
                next.delete(mod);
            } else {
                next.add(mod);
            }
            return next;
        });
    };

    const selectAllModules = () => {
        setFormModules(new Set(ALL_MODULES.map(m => m.key)));
    };

    const clearAllModules = () => {
        setFormModules(new Set());
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!formName.trim()) {
            showToast('Preencha o nome do plano.', 'warning');
            return;
        }

        if (formModules.size === 0) {
            showToast('Selecione pelo menos um módulo.', 'warning');
            return;
        }

        setIsSaving(true);
        const now = new Date().toISOString();

        const plan: SaaSPlan = {
            id: editingPlan?.id || crypto.randomUUID(),
            name: formName.trim(),
            price: parseFloat(formPrice) || 0,
            description: formDescription.trim(),
            modules: Array.from(formModules),
            isDefault: formIsDefault,
            createdAt: editingPlan?.createdAt || now,
            updatedAt: now
        };

        const res = await planService.save(plan);

        if (res.success) {
            showToast(editingPlan ? 'Plano atualizado!' : 'Plano criado com sucesso!', 'success');
            setIsModalOpen(false);
            loadPlans();
        } else {
            showToast(res.error || 'Erro ao salvar plano.', 'error');
        }

        setIsSaving(false);
    };

    const confirmDelete = (plan: SaaSPlan) => {
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Plano',
            message: `Deseja excluir o plano "${plan.name}"? Condomínios que o utilizam perderão a referência de funcionalidades.`,
            type: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                const res = await planService.remove(plan.id);
                if (res.success) {
                    showToast('Plano removido!', 'success');
                    loadPlans();
                } else {
                    showToast(res.error || 'Erro ao remover plano.', 'error');
                }
            }
        });
    };

    const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

    // ─── Guard ──────────────────────────────────
    if (authLoading) {
        return (
            <div className="py-24 flex flex-col items-center gap-4">
                <HabitaSpinner size="lg" variant="primary" showLabel label="Verificando Acessos..." />
            </div>
        );
    }

    if (!isSuperAdmin) {
        return (
            <div className="w-full animate-in fade-in duration-500 pb-16">
                <HabitaContainer>
                    <HabitaContainerHeader 
                        title="Acesso Restrito"
                        subtitle="Segurança de Sistema"
                        icon={<ShieldAlert size={24} />}
                    />
                    <HabitaContainerContent>
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                            <div className="p-6 bg-rose-50 text-rose-600 rounded-3xl border border-rose-100 shadow-sm animate-bounce">
                                <ShieldAlert size={48} />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Console de SuperAdmin</h1>
                                <p className="text-slate-500 max-w-md font-medium">
                                    Apenas o administrador global da plataforma pode gerenciar e configurar novos planos SaaS.
                                </p>
                            </div>
                        </div>
                    </HabitaContainerContent>
                </HabitaContainer>
            </div>
        );
    }

    return (
        <div className="w-full animate-in fade-in duration-500 pb-16">
            <HabitaContainer>
                <HabitaContainerHeader 
                    title="Planos SaaS"
                    subtitle="Gestão de pacotes e funcionalidades da plataforma"
                    icon={<Crown size={24} className="text-amber-500" />}
                    actions={
                        <div className="flex items-center gap-3">
                            <HabitaBadge variant="indigo" size="sm" className="hidden md:flex">SuperAdmin Console</HabitaBadge>
                            <HabitaButton
                                onClick={openCreateModal}
                                icon={<Plus size={18} />}
                            >
                                Novo Plano
                            </HabitaButton>
                        </div>
                    }
                />

                <HabitaContainerContent>
                    {loading ? (
                        <div className="py-24 flex flex-col items-center gap-4">
                            <HabitaSpinner size="lg" variant="primary" showLabel label="Sincronizando Planos..." />
                        </div>
                    ) : plans.length === 0 ? (
                        <HabitaCard className="py-20 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-slate-300 mb-6">
                                <Crown size={40} strokeWidth={1.5} />
                            </div>
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Sem Planos Configurados</h2>
                            <p className="text-slate-500 max-w-sm mb-8 font-medium">Crie estruturas de assinatura para definir quais módulos cada condomínio poderá acessar.</p>
                            <HabitaButton
                                onClick={openCreateModal}
                                icon={<Plus size={18} />}
                            >
                                Criar Primeiro Plano
                            </HabitaButton>
                        </HabitaCard>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {plans.map(plan => (
                                <HabitaCard 
                                    key={plan.id}
                                    className="group relative hover:border-amber-200 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-500"
                                    padding="none"
                                >
                                    {plan.isDefault && (
                                        <div className="absolute top-0 right-0 z-10 px-4 py-1.5 bg-amber-500 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-bl-2xl shadow-lg shadow-amber-500/20">
                                            Padrão
                                        </div>
                                    )}

                                    {/* Plan Header */}
                                    <div className="p-6 border-b border-slate-50">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-14 h-14 bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-100 shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-3 duration-500">
                                                <Crown size={28} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none mb-1 group-hover:text-amber-600 transition-colors">
                                                    {plan.name}
                                                </h3>
                                                {plan.description && (
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight line-clamp-1">{plan.description}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-baseline gap-1 mt-6">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest self-center mr-1">R$</span>
                                            <span className="text-3xl font-black text-slate-900 tracking-tighter">
                                                {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                            <span className="ml-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">/ mês</span>
                                        </div>
                                    </div>

                                    {/* Modules Quick List */}
                                    <div className="p-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <Puzzle size={14} className="text-indigo-400" />
                                                Módulos Ativos
                                            </span>
                                            <HabitaBadge variant="neutral" size="xs">
                                                {plan.modules.length} Ativos
                                            </HabitaBadge>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-2">
                                            {plan.modules.slice(0, 9).map(mod => {
                                                const moduleInfo = ALL_MODULES.find(m => m.key === mod);
                                                return (
                                                    <HabitaBadge key={mod} variant="indigo" size="xs" className="bg-indigo-50/50 border-indigo-100/50 text-indigo-700/80">
                                                        {moduleInfo?.label || mod}
                                                    </HabitaBadge>
                                                );
                                            })}
                                            {plan.modules.length > 9 && (
                                                <HabitaBadge variant="outline" size="xs">
                                                    +{plan.modules.length - 9} outros
                                                </HabitaBadge>
                                            )}
                                        </div>

                                        {plan.modules.length >= ALL_MODULES.length - 1 && (
                                            <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-200">
                                                    <CheckCircle2 size={16} />
                                                </div>
                                                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Acesso Total Liberado</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Plan Actions */}
                                    <div className="p-4 bg-slate-50/50 border-t border-slate-50 flex gap-2">
                                        <HabitaButton
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditModal(plan)}
                                            className="flex-1 bg-white hover:bg-white hover:text-indigo-600 shadow-sm"
                                            icon={<Pencil size={16} />}
                                        >
                                            Editar
                                        </HabitaButton>
                                        <HabitaButton
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => confirmDelete(plan)}
                                            className="h-10 w-10 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                            icon={<Trash2 size={18} />}
                                        />
                                    </div>
                                </HabitaCard>
                            ))}
                        </div>
                    )}
                </HabitaContainerContent>
            </HabitaContainer>

            {/* Modal de Criação / Edição */}
            <HabitaModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingPlan ? "Editar Plano SaaS" : "Novo Plano SaaS"}
                size="lg"
                footer={
                    <>
                        <HabitaButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</HabitaButton>
                        <HabitaButton 
                            onClick={() => handleSave()}
                            disabled={isSaving}
                            isLoading={isSaving}
                            icon={<SaveIcon size={18} className="mr-0" />}
                        >
                            {editingPlan ? 'Salvar Alterações' : 'Criar Novo Plano'}
                        </HabitaButton>
                    </>
                }
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <HabitaInput
                        label="Nome do Plano"
                        placeholder="Ex: Essencial, Premium..."
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                        className="font-black text-slate-800"
                        required
                    />
                    <HabitaInput
                        label="Valor Mensal (R$)"
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={formPrice}
                        onChange={e => setFormPrice(e.target.value)}
                        className="font-black text-indigo-600"
                    />
                    <HabitaInput
                        label="Breve Descrição"
                        placeholder="Principais atrativos deste plano"
                        value={formDescription}
                        onChange={e => setFormDescription(e.target.value)}
                        containerClassName="md:col-span-2"
                    />
                    
                    <div className="md:col-span-2">
                        <HabitaCheckbox
                            label="Definir como Plano Padrão"
                            checked={formIsDefault}
                            onChange={(e) => setFormIsDefault(e.target.checked)}
                            containerClassName="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 h-auto"
                        />
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-14 -mt-2">
                            Novos condomínios começarão com este pacote
                        </p>
                    </div>
                </div>

                {/* Module selection */}
                <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-50 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                <Puzzle size={20} />
                            </div>
                            <div className="flex flex-col">
                                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Seleção de Módulos</h4>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    {formModules.size} selecionados de {ALL_MODULES.length}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <HabitaButton variant="ghost" size="sm" onClick={selectAllModules} className="text-indigo-600 hover:bg-indigo-50">
                                Marcar Todos
                            </HabitaButton>
                            <HabitaButton variant="ghost" size="sm" onClick={clearAllModules} className="text-slate-400">
                                Limpar
                            </HabitaButton>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {MODULE_CATEGORIES.map(category => {
                            const categoryModules = ALL_MODULES.filter(m => m.category === category);
                            return (
                                <div key={category} className="space-y-4">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                                        <ChevronRight size={12} />
                                        {category}
                                    </h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {categoryModules.map(mod => {
                                            const isSelected = formModules.has(mod.key);
                                            return (
                                                <button
                                                    key={mod.key}
                                                    type="button"
                                                    onClick={() => toggleModule(mod.key)}
                                                    className={clsx(
                                                        "group p-3 rounded-2xl border text-left transition-all flex items-center gap-3",
                                                        isSelected
                                                            ? "bg-indigo-50/50 border-indigo-200 text-indigo-900 shadow-sm"
                                                            : "bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <div className={clsx(
                                                        "w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all",
                                                        isSelected
                                                            ? "bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-200"
                                                            : "bg-white border-slate-200 group-hover:border-indigo-300"
                                                    )}>
                                                        {isSelected && <Check size={12} strokeWidth={4} className="text-white" />}
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-wider">
                                                        {mod.label}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </HabitaModal>

            {/* Confirm Removal Modal */}
            <HabitaModal
                isOpen={confirmModal.isOpen}
                onClose={closeConfirm}
                title={confirmModal.title}
                size="sm"
                footer={
                    <>
                        <HabitaButton variant="outline" onClick={closeConfirm}>Cancelar</HabitaButton>
                        <HabitaButton 
                            variant="danger" 
                            onClick={confirmModal.onConfirm}
                        >
                            Excluir Plano
                        </HabitaButton>
                    </>
                }
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 border border-rose-100 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
                        <AlertCircle size={32} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Atenção!</h3>
                    <p className="text-slate-500 text-xs leading-relaxed font-medium">
                        {confirmModal.message}
                    </p>
                </div>
            </HabitaModal>
        </div>
    );
}

// Internal reusable Save icon component if needed, or just use naming from lucide
function SaveIcon({ size, className }: { size?: number, className?: string }) {
    return (
        <svg 
            width={size || 24} 
            height={size || 24} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
    )
}
