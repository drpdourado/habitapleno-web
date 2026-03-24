import { useState, useEffect } from 'react';
import {
    Shield, Plus, Pencil, Trash2, Check,
    Info, Settings,
    FileText, Gauge, DollarSign, Users, RefreshCcw, MessageSquare,
    History as HistoryIcon, AlertCircle, Wrench, Calendar as CalendarIcon, BarChart2
} from 'lucide-react';
import {
    fetchAllAccessProfiles,
    saveAccessProfile,
    deleteAccessProfile
} from '../utils/FirebaseUtils';
import type { AccessProfile, AccessLevel, SystemModule } from '../utils/rbac';
import { hasPermission } from '../utils/rbac';
import { useToast } from '../contexts/ToastContext';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';

// Habita Design System
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { HabitaCard } from '../components/ui/HabitaCard';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaTable, HabitaTHead, HabitaTBody, HabitaTR, HabitaTH, HabitaTD } from '../components/ui/HabitaTable';
import { HabitaInput } from '../components/ui/HabitaForm';
import { HabitaIconActionButton } from '../components/ui/HabitaIconActionButton';
import { HabitaSpinner } from '../components/ui/HabitaSpinner';

const MODULES: { id: SystemModule; label: string; icon: any }[] = [
    { id: 'gas', label: 'Consumo de Gás (Leituras)', icon: Gauge },
    { id: 'financial', label: 'Financeiro (Contas/Totalizadores)', icon: DollarSign },
    { id: 'units', label: 'Unidades (Cadastros)', icon: Users },
    { id: 'history', label: 'Apuração de Consumo', icon: FileText },
    { id: 'documents', label: 'Central de Documentos', icon: FileText },
    { id: 'mural', label: 'Mural de Recados', icon: FileText },
    { id: 'users', label: 'Gestão de Usuários', icon: Users },
    { id: 'profiles', label: 'Perfis de Acesso', icon: Shield },
    { id: 'categories', label: 'Rubricas', icon: Settings },
    { id: 'reconciliation', label: 'Conciliação Bancária', icon: RefreshCcw },
    { id: 'improvements', label: 'Memória do Condomínio', icon: HistoryIcon },
    { id: 'settings', label: 'Configurações de Medição', icon: Settings },
    { id: 'access', label: 'Portaria (Controle de Acesso)', icon: Shield },
    { id: 'ocorrencias', label: 'Ocorrências', icon: AlertCircle },
    { id: 'packages', label: 'Encomendas / Correspondências', icon: HistoryIcon },
    { id: 'manutencoes', label: 'Manutenções Preventivas', icon: Wrench },
    { id: 'closures', label: 'Encerramento de Mês', icon: Shield },
    { id: 'reports', label: 'Relatórios Gerenciais', icon: FileText },
    { id: 'areas', label: 'Reservas e Áreas Comuns', icon: CalendarIcon },
    { id: 'polls', label: 'Assembleia Digital (Enquetes)', icon: BarChart2 },
    { id: 'contact', label: 'Fale com o Síndico (Chamados)', icon: MessageSquare },
    { id: 'bank_accounts', label: 'Gestão de Contas Bancárias', icon: HistoryIcon },
];

const ACCESS_LEVELS: { value: AccessLevel; label: string; description: string; color: string }[] = [
    { value: 'none', label: 'Nenhum', description: 'Sem acesso ao módulo', color: 'bg-slate-100 text-slate-500' },
    { value: 'own', label: 'Próprio', description: 'Apenas dados vinculados ao usuário', color: 'bg-blue-100 text-blue-600' },
    { value: 'all', label: 'Total', description: 'Acesso completo (Leitura/Escrita)', color: 'bg-emerald-100 text-emerald-600' },
];

const ProfilesPage = () => {
    const [profiles, setProfiles] = useState<AccessProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingProfile, setEditingProfile] = useState<AccessProfile | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [profileToDelete, setProfileToDelete] = useState<AccessProfile | null>(null);

    const { showToast } = useToast();
    const { accessProfile } = useAuth();

    const loadProfiles = async () => {
        try {
            const data = await fetchAllAccessProfiles();
            setProfiles(data);
        } catch {
            showToast('Erro ao carregar perfis', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (hasPermission(accessProfile, 'profiles', 'all')) {
            loadProfiles();
        } else {
            setLoading(false);
        }
    }, [accessProfile]);

    const handleNewProfile = () => {
        const newProfile: AccessProfile = {
            id: `profile_${Date.now()}`,
            name: '',
            description: '',
            permissions: {
                gas: 'none',
                financial: 'none',
                units: 'none',
                mural: 'none',
                users: 'none',
                profiles: 'none',
                settings: 'none',
                history: 'none',
                reconciliation: 'none',
                documents: 'none',
                improvements: 'none',
                categories: 'none',
                access: 'none',
                ocorrencias: 'none',
                packages: 'none',
                manutencoes: 'none',
                closures: 'none',
                reports: 'none',
                areas: 'none',
                polls: 'none',
                contact: 'none',
                bank_accounts: 'none'
            },
            condominiumId: ''
        };
        setEditingProfile(newProfile);
        setIsEditing(true);
    };

    const handleEditProfile = (profile: AccessProfile) => {
        setEditingProfile(JSON.parse(JSON.stringify(profile)));
        setIsEditing(true);
    };

    const handleSaveProfile = async () => {
        if (!editingProfile?.name) {
            showToast('Por favor, informe o nome do perfil', 'warning');
            return;
        }

        try {
            await saveAccessProfile(editingProfile);
            showToast('Perfil salvo com sucesso!', 'success');
            setIsEditing(false);
            setEditingProfile(null);
            loadProfiles();
        } catch {
            showToast('Erro ao salvar perfil', 'error');
        }
    };

    const handleDeleteProfile = async () => {
        if (!profileToDelete) return;

        if (profileToDelete.isDefault || 
            profileToDelete.id.startsWith('perfil_sindico-') || 
            profileToDelete.id.startsWith('perfil_zelador-') || 
            profileToDelete.id.startsWith('perfil_proprietario-') || 
            profileToDelete.id.startsWith('perfil_inquilino-') ||
            profileToDelete.id.startsWith('perfil_morador-')) {
            showToast('Perfis críticos do sistema não podem ser excluídos', 'warning');
            setIsDeleteModalOpen(false);
            return;
        }

        try {
            await deleteAccessProfile(profileToDelete.id);
            showToast('Perfil excluído com sucesso', 'success');
            loadProfiles();
        } catch {
            showToast('Erro ao excluir perfil', 'error');
        } finally {
            setIsDeleteModalOpen(false);
            setProfileToDelete(null);
        }
    };

    const togglePermission = (module: SystemModule, level: AccessLevel) => {
        if (!editingProfile) return;
        setEditingProfile({
            ...editingProfile,
            permissions: {
                ...editingProfile.permissions,
                [module]: level
            }
        });
    };

    if (!hasPermission(accessProfile, 'profiles', 'all')) {
        return (
            <div className="w-full animate-in fade-in duration-500 pb-16">
                <HabitaContainer>
                    <HabitaContainerHeader 
                        title="Acesso Restrito"
                        subtitle="Segurança de Sistema"
                        icon={<Shield size={24} />}
                    />
                    <HabitaContainerContent>
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                            <div className="p-6 bg-rose-50 text-rose-600 rounded-3xl border border-rose-100 shadow-sm animate-bounce">
                                <Shield size={48} />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Privilégios Insuficientes</h1>
                                <p className="text-slate-500 max-w-md font-medium">
                                    Sua conta não possui as permissões necessárias para gerenciar perfis de acesso e privilégios operacionais.
                                </p>
                            </div>
                        </div>
                    </HabitaContainerContent>
                </HabitaContainer>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="w-full animate-in fade-in duration-500 pb-16">
                <HabitaContainer>
                    <HabitaContainerContent>
                        <div className="flex flex-col items-center justify-center py-32">
                            <HabitaSpinner size="lg" variant="primary" showLabel label="Consultando Perfis..." />
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
                    title="Perfis de Acesso"
                    subtitle="Gestão de funções e privilégios operacionais do sistema"
                    icon={<Shield size={24} />}
                    actions={
                        !isEditing && (
                            <HabitaButton
                                onClick={handleNewProfile}
                                icon={<Plus size={18} />}
                            >
                                Novo Perfil
                            </HabitaButton>
                        )
                    }
                />

                <HabitaContainerContent padding={isEditing ? "none" : "md"}>
                    {!isEditing ? (
                        <div className="p-4 md:p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {profiles.map(profile => (
                                    <HabitaCard key={profile.id} variant="white" className="group overflow-hidden border-slate-100 hover:border-emerald-200 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5">
                                        <div className="p-6">
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-100 transition-all duration-500">
                                                    <Shield size={24} />
                                                </div>
                                                <div className="flex gap-2">
                                                    <HabitaIconActionButton
                                                        variant="ghost"
                                                        size="sm"
                                                        tooltip="Editar Perfil"
                                                        className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                                        icon={<Pencil />}
                                                        onClick={() => handleEditProfile(profile)}
                                                    />
                                                    {!profile.isDefault && (
                                                        <HabitaIconActionButton
                                                            variant="ghost"
                                                            size="sm"
                                                            tooltip="Excluir Perfil"
                                                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                            icon={<Trash2 />}
                                                            onClick={() => { setProfileToDelete(profile); setIsDeleteModalOpen(true); }}
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mb-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                                                        {profile.name}
                                                    </h3>
                                                    {profile.isDefault && (
                                                        <HabitaBadge variant="indigo" size="xs">Padrão</HabitaBadge>
                                                    )}
                                                </div>
                                                <p className="text-slate-500 text-xs leading-relaxed font-medium line-clamp-2 min-h-[32px]">
                                                    {profile.description || "Sem descrição disponível para este perfil operacional."}
                                                </p>
                                            </div>

                                            <div className="pt-5 border-t border-slate-50 grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Módulos</span>
                                                    <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                                                        <Check size={12} className="text-emerald-500" />
                                                        {Object.values(profile.permissions).filter(p => p !== 'none').length} Ativos
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Acesso</span>
                                                    <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                                                        <Info size={12} className="text-blue-500" />
                                                        Diferenciado
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </HabitaCard>
                                ))}
                                {profiles.length === 0 && (
                                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-center opacity-40">
                                        <Shield size={48} className="text-slate-300 mb-4" />
                                        <p className="text-slate-500 font-black text-xs uppercase tracking-widest">Nenhum perfil cadastrado no sistema</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                            {/* Editor Header */}
                            <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-100 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                    <HabitaInput
                                        label="Nome do Perfil"
                                        placeholder="Ex: Zelador Administrativo, Morador Especial..."
                                        value={editingProfile?.name}
                                        onChange={e => setEditingProfile(p => p ? { ...p, name: e.target.value } : null)}
                                        className="font-black text-slate-800 tracking-tight"
                                        autoFocus
                                    />
                                    <HabitaInput
                                        label="Descrição Curta"
                                        placeholder="Defina as responsabilidades deste perfil..."
                                        value={editingProfile?.description}
                                        onChange={e => setEditingProfile(p => p ? { ...p, description: e.target.value } : null)}
                                        className="font-medium text-slate-600"
                                    />
                                </div>
                                <div className="grid grid-cols-2 lg:flex lg:items-center gap-3 shrink-0 w-full lg:w-auto">
                                    <HabitaButton
                                        variant="outline"
                                        onClick={() => setIsEditing(false)}
                                        className="w-full lg:px-6"
                                    >
                                        Descartar
                                    </HabitaButton>
                                    <HabitaButton
                                        onClick={handleSaveProfile}
                                        className="w-full lg:px-8 bg-emerald-600 border-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                                        icon={<Check size={20} />}
                                    >
                                        Salvar Perfil
                                    </HabitaButton>
                                </div>
                            </div>

                            {/* Matrix Column */}
                            <div className="overflow-hidden">
                                <HabitaTable responsive>
                                    <HabitaTHead>
                                        <HabitaTR>
                                            <HabitaTH className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/3">Módulo Funcional</HabitaTH>
                                            <HabitaTH align="center" className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest md:table-cell">Configuração de Privilégios</HabitaTH>
                                        </HabitaTR>
                                    </HabitaTHead>
                                    <HabitaTBody>
                                        {MODULES.map(module => (
                                            <HabitaTR key={module.id} className="hover:bg-slate-50/30 transition-all duration-300 group">
                                                <HabitaTD label="Módulo" className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-emerald-500 group-hover:border-emerald-100 group-hover:shadow-sm transition-all duration-500">
                                                            <module.icon size={18} />
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="font-black text-slate-800 text-sm tracking-tight uppercase">{module.label}</div>
                                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-60">Segurança de Módulo</div>
                                                        </div>
                                                    </div>
                                                </HabitaTD>
                                                <HabitaTD label="Privilégios" className="px-8 py-5">
                                                    <div className="flex items-center justify-center gap-1 md:gap-2 bg-slate-50/80 p-1 md:p-1.5 rounded-xl md:rounded-2xl w-full md:w-fit mx-auto border border-slate-100 shadow-inner overflow-x-auto no-scrollbar">
                                                        {ACCESS_LEVELS.map(level => {
                                                            const isActive = editingProfile?.permissions[module.id] === level.value;
                                                            return (
                                                                <button
                                                                    key={level.value}
                                                                    onClick={() => togglePermission(module.id, level.value)}
                                                                    className={clsx(
                                                                        "flex-1 md:flex-none px-2 md:px-6 py-2 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap",
                                                                        isActive
                                                                            ? level.color + " shadow-lg shadow-black/5 scale-105"
                                                                            : "text-slate-400 hover:text-slate-600 hover:bg-white"
                                                                    )}
                                                                    title={level.description}
                                                                >
                                                                    {level.label}
                                                                </button>
                                                            );
                                                        })}
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

            {/* Guia de Referência */}
            <div className="mt-8 px-4 max-w-4xl mx-auto">
                <div className="bg-indigo-50/30 border-2 border-indigo-100/50 rounded-3xl p-8 flex items-start gap-6 backdrop-blur-sm">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-200/50">
                        <Info size={24} />
                    </div>
                    <div>
                        <h4 className="text-indigo-900 font-black text-sm uppercase tracking-tight mb-3">Guia de Privilégios Corporativos</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nenhum</span>
                                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">Módulo invisível no menu e acesso bloqueado.</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block">Próprio</span>
                                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">Apenas dados vinculados à sua Identidade.</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block">Total</span>
                                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">Gestão administrativa completa do recurso.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <HabitaModal
                isOpen={isDeleteModalOpen}
                onClose={() => { setIsDeleteModalOpen(false); setProfileToDelete(null); }}
                title="Excluir Perfil Operacional"
                size="sm"
                footer={
                    <>
                        <HabitaButton variant="outline" onClick={() => { setIsDeleteModalOpen(false); setProfileToDelete(null); }}>
                            Cancelar
                        </HabitaButton>
                        <HabitaButton
                            variant="primary"
                            className="bg-rose-600 border-rose-600 hover:bg-rose-700"
                            onClick={handleDeleteProfile}
                        >
                            Confirmar Exclusão
                        </HabitaButton>
                    </>
                }
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6 border border-rose-100 shadow-sm animate-pulse">
                        <AlertCircle size={32} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Ação Crítica</h3>
                    <p className="text-slate-500 text-xs leading-relaxed font-medium">
                        Você está prestes a excluir o perfil <span className="font-black text-slate-800">"{profileToDelete?.name}"</span>. Esta ação removerá os privilégios vinculados a este perfil permanentemente.
                    </p>
                </div>
            </HabitaModal>
        </div>
    );
};

export default ProfilesPage;
