import { useState, useEffect } from 'react';
import api from '../services/api';
import { Building, Plus, CheckCircle2, ShieldAlert, Trash2, Check, Sparkles, Megaphone, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import type { SaaSPlan } from '../services/PlanService';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';

// Habita Design System
import { HabitaCombobox, type HabitaOption } from '../components/ui/HabitaCombobox';
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaInput } from '../components/ui/HabitaForm';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaSpinner } from '../components/ui/HabitaSpinner';
import { HabitaTable, HabitaTBody, HabitaTR, HabitaTD } from '../components/ui/HabitaTable';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaIconActionButton } from '../components/ui/HabitaIconActionButton';

interface Condo {
    id: string;
    name: string;
    cnpj: string;
    address: string;
    managerEmail: string;
    createdAt: string;
    planId?: string;
    status?: string;
    activePlan?: SaaSPlan | string | null;
}

export function CondosPage() {
    const { isSuperAdmin, loading: authLoading } = useAuth();
    const { switchTenant, tenantId } = useApp();
    const { showToast } = useToast();

    const [condos, setCondos] = useState<Condo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [plans, setPlans] = useState<any[]>([]);
    const [assigningPlan, setAssigningPlan] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<Condo | null>(null);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);

    const planOptions: HabitaOption[] = [
        { value: '', label: 'Sem Plano' },
        ...plans.map(p => ({ value: p.id, label: p.name }))
    ];

    // Form State
    const [newName, setNewName] = useState('');
    const [newCNPJ, setNewCNPJ] = useState('');
    const [newAddress, setNewAddress] = useState('');
    const [newManagerEmail, setNewManagerEmail] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        loadCondos();
        loadPlans();
    }, []);

    const loadPlans = async () => {
        try {
            const res = await api.get('/plans');
            setPlans(res.data.data || []);
        } catch (e) {
            console.error("Error loading plans:", e);
        }
    };

    const loadCondos = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/condos');
            setCondos(res.data.data || []);
        } catch (error) {
            console.error("Error loading condos:", error);
            showToast("Erro ao carregar condomínios.", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newName.trim()) {
            showToast("Nome do condomínio é obrigatório.", "warning");
            return;
        }

        setIsCreating(true);
        try {
            await api.post('/condos', {
                name: newName,
                cnpj: newCNPJ,
                address: newAddress,
                managerEmail: newManagerEmail
            });

            showToast(`Condomínio "${newName}" criado com sucesso!`, 'success');
            setNewName('');
            setNewCNPJ('');
            setNewAddress('');
            setNewManagerEmail('');
            setIsCreateModalOpen(false);
            loadCondos();

        } catch (error: any) {
            console.error("Error creating condo:", error);
            showToast("Erro ao criar condomínio: " + (error.response?.data?.error || error.message), 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const confirmDelete = async () => {
        if (!isDeleting) return;
        setIsDeleteLoading(true);
        try {
            await api.delete(`/condos/${isDeleting.id}`);
            showToast("Ambiente removido com sucesso!", 'success');
            loadCondos();
        } catch (error: any) {
            console.error("Erro ao excluir condomínio:", error);
            showToast("Erro ao processar exclusão: " + (error.response?.data?.error || error.message), 'error');
        } finally {
            setIsDeleteLoading(false);
            setIsDeleting(null);
        }
    };

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
                        subtitle="Segurança de Plataforma"
                        icon={<ShieldAlert size={18} />}
                        iconVariant="rose"
                    />
                    <HabitaContainerContent padding="lg">
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-8 animate-in zoom-in duration-700">
                            <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2rem] border border-rose-100 shadow-xl shadow-rose-500/5 flex items-center justify-center transform hover:rotate-12 transition-transform duration-500">
                                <ShieldAlert size={64} strokeWidth={1.5} />
                            </div>
                            <div className="space-y-4">
                                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Console de SuperAdmin</h1>
                                <p className="text-slate-500 max-w-sm font-semibold leading-relaxed text-sm">
                                    Apenas o administrador global da plataforma HabitarPleno pode gerenciar e provisionar novos ambientes SaaS.
                                </p>
                            </div>
                            <HabitaButton
                                onClick={() => window.history.back()}
                                variant="outline"
                                className="h-11 px-8 rounded-xl font-black uppercase tracking-[0.2em] text-[10px]"
                            >
                                Voltar ao Painel
                            </HabitaButton>
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
                    title="Gestão de Condomínios"
                    subtitle="Administração de Inquilinos e Instâncias SaaS"
                    icon={<Building size={18} />}
                    actions={
                        <div className="flex items-center gap-3">
                            <HabitaBadge variant="neutral" className="h-10 px-4 font-black uppercase tracking-widest bg-slate-100 border-slate-200 text-slate-500 hidden md:flex items-center">
                                <ShieldAlert size={14} className="mr-2" /> SuperAdmin Console
                            </HabitaBadge>
                            <HabitaButton
                                onClick={() => setIsCreateModalOpen(true)}
                                icon={<Plus size={18} />}
                                className="bg-indigo-600 border-indigo-600 hover:bg-indigo-700 hover:scale-105"
                            >
                                Novo Ambiente
                            </HabitaButton>
                        </div>
                    }
                />

                <HabitaContainerContent>
                    {isLoading ? (
                        <div className="py-32 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
                            <HabitaSpinner size="xl" />
                            <div className="flex flex-col items-center text-center">
                                <span className="text-[12px] text-slate-900 font-black uppercase tracking-[0.2em] mb-1">Sincronizando Clusters</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse italic">Mapeando instâncias e planos ativos...</span>
                            </div>
                        </div>
                    ) : (
                        <HabitaTable
                            responsive
                            headers={['Condomínio', 'Identificação', 'Plano SaaS', 'Ações']}
                        >
                            <HabitaTBody>
                                {condos.map(condo => (
                                    <HabitaTR
                                        key={condo.id}
                                        className={clsx(
                                            "group",
                                            condo.id === tenantId && "bg-emerald-50/20"
                                        )}
                                    >
                                        <HabitaTD label="Condomínio">
                                            <div className="flex items-center gap-4">
                                                <div className={clsx(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm transition-all group-hover:scale-105 duration-300",
                                                    condo.id === tenantId ? "bg-emerald-100 border-emerald-200 text-emerald-600 shadow-emerald-100" : "bg-white border-slate-100 text-slate-400"
                                                )}>
                                                    <Building size={24} />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-slate-900 text-sm md:text-base uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                                                            {condo.name}
                                                        </span>
                                                        {condo.id === tenantId && (
                                                            <HabitaBadge variant="success" size="xs" className="font-black scale-90">Ativo</HabitaBadge>
                                                        )}
                                                    </div>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                        <CheckCircle2 size={10} className="text-emerald-500" />
                                                        Provisionado em {new Date(condo.createdAt).toLocaleDateString('pt-BR')}
                                                    </span>
                                                </div>
                                            </div>
                                        </HabitaTD>
                                        <HabitaTD label="Identificação">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-1.5">
                                                    <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono text-[9px] font-bold border border-slate-200 shadow-inner">ID: {condo.id}</code>
                                                </div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CNPJ: {condo.cnpj || '—'}</span>
                                            </div>
                                        </HabitaTD>
                                        <HabitaTD label="Plano SaaS">
                                            <HabitaCombobox
                                                containerClassName="min-w-[150px]"
                                                value={(condo.planId || (typeof condo.activePlan === 'string' ? condo.activePlan : condo.activePlan?.id)) || ''}
                                                disabled={assigningPlan === condo.id}
                                                placeholder="Sem Plano"
                                                options={planOptions}
                                                onChange={async (val) => {
                                                    const planId = val || null;
                                                    setAssigningPlan(condo.id);
                                                    try {
                                                        await api.post(`/condos/${condo.id}/assign-plan`, { planId });
                                                        setCondos(prev => prev.map(c =>
                                                            c.id === condo.id ? { ...c, planId: planId || undefined } : c
                                                        ));
                                                        const planName = plans.find(p => p.id === planId)?.name || 'Nenhum';
                                                        showToast(`Plano "${planName}" atribuído!`, 'success');
                                                    } catch (error: any) {
                                                        showToast(error.response?.data?.error || 'Erro ao atribuir plano.', 'error');
                                                    }
                                                    setAssigningPlan(null);
                                                }}
                                                className="h-9 shadow-none text-[9px] font-black uppercase tracking-wider bg-slate-50/50 border-slate-200 hover:border-indigo-300 transition-all rounded-lg"
                                            />
                                        </HabitaTD>
                                        <HabitaTD label="Ações">
                                            <div className="flex items-center justify-end gap-2">
                                                {condo.id !== 'vista-verde-01' && (
                                                    <HabitaIconActionButton
                                                        icon={<Trash2 />}
                                                        variant="ghost"
                                                        size="sm"
                                                        tooltip="Excluir Ambiente"
                                                        onClick={() => setIsDeleting(condo)}
                                                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                    />
                                                )}

                                                {condo.id !== tenantId ? (
                                                    <HabitaButton
                                                        onClick={() => switchTenant(condo.id)}
                                                        size="sm"
                                                        className="h-9 px-5 text-[9px] font-black bg-white border-slate-200 text-slate-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all"
                                                    >
                                                        Gerenciar
                                                    </HabitaButton>
                                                ) : (
                                                    <div className="h-9 px-5 flex items-center gap-2 text-[9px] font-black bg-emerald-600 text-white rounded-lg border border-emerald-500 uppercase tracking-widest shadow-lg shadow-emerald-500/20 transform hover:scale-105 transition-all">
                                                        <Check size={14} strokeWidth={3} /> Dashboard Ativo
                                                    </div>
                                                )}
                                            </div>
                                        </HabitaTD>
                                    </HabitaTR>
                                ))}
                            </HabitaTBody>
                        </HabitaTable>
                    )}
                </HabitaContainerContent>
            </HabitaContainer>

            {/* Modal: Provisionamento */}
            <HabitaModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Provisionar Nova Instância SaaS"
                size="lg"
                footer={
                    <div className="flex gap-4 w-full">
                        <HabitaButton variant="outline" onClick={() => setIsCreateModalOpen(false)} className="flex-1 h-11 uppercase font-bold tracking-widest text-[10px]">Descartar</HabitaButton>
                        <HabitaButton
                            onClick={handleCreate}
                            isLoading={isCreating}
                            icon={<Plus size={18} />}
                            className="flex-[2] h-11 uppercase font-black tracking-widest text-[10px] bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100"
                        >
                            Ativar Ambiente
                        </HabitaButton>
                    </div>
                }
            >
                <div className="space-y-10 pb-4">
                    <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-3xl flex items-start gap-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Sparkles size={120} />
                        </div>
                        <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-xl shadow-indigo-200 transform group-hover:scale-110 transition-transform">
                            <Sparkles size={28} />
                        </div>
                        <div className="space-y-2 relative z-10">
                            <h4 className="text-sm font-black text-indigo-900 uppercase tracking-tight leading-none">Setup Automatizado SaaS</h4>
                            <p className="text-[10px] font-bold text-indigo-700/60 leading-relaxed uppercase tracking-widest">
                                O sistema irá configurar automaticamente clusters de bancos, planos de contas, parâmetros financeiros e categorias padrão.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl border border-slate-100 shadow-sm"><Megaphone size={18} /></div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Parâmetros de Provisionamento</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <HabitaInput
                                label="Nome Fantasia do Condomínio"
                                placeholder="Ex: Edifício Corporate Tower"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                required
                                className="font-black text-slate-800"
                            />

                            <HabitaInput
                                label="CNPJ / Identificação Fiscal"
                                placeholder="00.000.000/0000-00"
                                value={newCNPJ}
                                onChange={e => setNewCNPJ(e.target.value)}
                            />

                            <HabitaInput
                                label="E-mail do Gestor Responsável"
                                type="email"
                                placeholder="gestao@condominio.com"
                                value={newManagerEmail}
                                onChange={e => setNewManagerEmail(e.target.value)}
                            />

                            <HabitaInput
                                label="Endereço de Instalação/Sede"
                                placeholder="Logradouro, Número, Cidade - UF"
                                value={newAddress}
                                onChange={e => setNewAddress(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </HabitaModal>

            {/* Modal: Confirmação de Exclusão */}
            <HabitaModal
                isOpen={!!isDeleting}
                onClose={() => setIsDeleting(null)}
                title="Revogar Ambiente SaaS"
                size="sm"
                footer={
                    <div className="flex gap-3 w-full">
                        <HabitaButton variant="outline" onClick={() => setIsDeleting(null)} className="flex-1 font-bold uppercase tracking-widest text-[10px] h-11">Manter Cluster</HabitaButton>
                        <HabitaButton
                            variant="danger"
                            onClick={confirmDelete}
                            isLoading={isDeleteLoading}
                            className="flex-1 font-black uppercase tracking-widest text-[10px] h-11 bg-rose-600 border-rose-600 shadow-lg shadow-rose-100"
                        >
                            Revogar
                        </HabitaButton>
                    </div>
                }
            >
                <div className="text-center py-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
                    <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2.5rem] flex items-center justify-center mx-auto border border-rose-100 shadow-xl shadow-rose-500/5 animate-pulse">
                        <Trash2 size={48} strokeWidth={1.5} />
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight">Eliminar Inquilino?</h4>
                        <div className="space-y-2">
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed px-4">Esta ação é <span className="text-rose-600 font-black underline">irreversível</span> e removerá TODAS as instâncias de dados, backups e acessos do condomínio:</p>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 inline-block mx-auto">
                                <span className="text-[12px] font-black text-slate-700 uppercase">{isDeleting?.name}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4 text-left">
                        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                        <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest leading-relaxed">
                            A plataforma irá verificar dependências críticas antes de prosseguir com o wipe de dados.
                        </p>
                    </div>
                </div>
            </HabitaModal>
        </div>
    );
}
