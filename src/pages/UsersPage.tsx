import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext'; 
import { 
    Users, UserPlus, Shield, 
    AlertTriangle, Edit, Trash2, Key,
    Info, Search, User, Check
} from 'lucide-react';
import { getRoleFromProfile, hasPermission } from '../utils/rbac';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

// Habita Design System
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaInput } from '../components/ui/HabitaForm';
import { HabitaTable, HabitaTHead, HabitaTBody, HabitaTR, HabitaTH, HabitaTD } from '../components/ui/HabitaTable';
import { HabitaCombobox } from '../components/ui/HabitaCombobox';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { HabitaSpinner } from '../components/ui/HabitaSpinner';
import { HabitaIconActionButton } from '../components/ui/HabitaIconActionButton';

export interface Vinculo {
    condominiumId?: string;
    role: string;
    profileId: string;
    unitId?: string;
}

export interface UserProfile {
    uid: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    profileId?: string;
    unitId?: string;
    vinculos?: Vinculo[];
    vinculosCondoIds?: string[];
    condominiumId?: string;
}

export interface AccessProfile {
    id: string;
    name: string;
    permissions?: Record<string, any>;
}

const UsersPage = () => {
    const { user, accessProfile, resetPassword } = useAuth();
    const { showToast } = useToast();
    const { units } = useApp();

    // UI state
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Data state
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [profiles, setProfiles] = useState<AccessProfile[]>([]);

    // Create Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        profileId: '',
        unitId: ''
    });

    // Edit State
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [editFormData, setEditFormData] = useState({
        name: '',
        phone: '',
        profileId: '',
        unitId: ''
    });

    // Delete State
    const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const [usersResult, profilesResult] = await Promise.all([
                api.get('/users'),
                api.get('/profiles')
            ]);
            
            setUsers(usersResult.data.data || []);
            setProfiles(profilesResult.data.data || []);
            
            const profilesArray = profilesResult.data.data || [];
            const defaultMorador = profilesArray.find((p: AccessProfile) => p.id.startsWith('morador-'))?.id;
            if (defaultMorador && !formData.profileId) {
                setFormData(prev => ({ ...prev, profileId: defaultMorador }));
            }
        } catch (error) {
            console.error('Failed to load users/profiles:', error);
            showToast('Erro ao carregar dados dos usuários.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    // Computed
    const filteredUsers = useMemo(() => {
        if (!searchQuery) return users;
        const lowerQuery = searchQuery.toLowerCase();
        return users.filter(u => 
            u.name?.toLowerCase().includes(lowerQuery) || 
            u.email?.toLowerCase().includes(lowerQuery) ||
            u.unitId?.toLowerCase().includes(lowerQuery)
        );
    }, [users, searchQuery]);

    const handleCreateUser = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsProcessing(true);

        const selectedProfile = profiles.find(p => p.id === formData.profileId);
        const isMorador = selectedProfile?.id.startsWith('morador-') ||
            (selectedProfile?.permissions?.gas === 'own' ||
                selectedProfile?.permissions?.history === 'own' ||
                selectedProfile?.permissions?.units === 'own');

        if (isMorador && !formData.unitId) {
            showToast('Moradores precisam de uma unidade vinculada.', 'warning');
            setIsProcessing(false);
            return;
        }

        try {
            await api.post('/users', formData);
            showToast('Usuário criado com sucesso!', 'success');
            resetForm();
            setIsCreateModalOpen(false);
            loadUsers();
        } catch (error: any) {
            console.error("User creation error:", error);
            showToast(`Erro ao criar usuário: ${error.response?.data?.error || error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditUser = (u: UserProfile) => {
        setEditingUser(u);
        setEditFormData({
            name: u.name || '',
            phone: u.phone || '',
            profileId: u.profileId || '',
            unitId: u.unitId || ''
        });
    };

    const handleSaveEdit = async () => {
        if (!editingUser) return;
        setIsProcessing(true);

        const selectedProfile = profiles.find(p => p.id === editFormData.profileId);
        const newRole = selectedProfile ? getRoleFromProfile(selectedProfile) : 'resident';

        try {
            const updatedProfile = {
                ...editingUser,
                name: editFormData.name,
                phone: editFormData.phone,
                profileId: editFormData.profileId,
                role: newRole,
                unitId: editFormData.unitId || undefined
            };

            await api.put(`/users/${editingUser.uid}`, updatedProfile);
            
            showToast('Usuário atualizado com sucesso!', 'success');
            setEditingUser(null);
            loadUsers();
        } catch (error: any) {
            console.error('Error updating user:', error);
            showToast('Erro ao atualizar usuário: ' + (error.response?.data?.error || error.message), 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const confirmDelete = async () => {
        if (!deletingUser) return;
        setIsProcessing(true);
        try {
            await api.delete(`/users/${deletingUser.uid}`);
            showToast('Usuário removido com sucesso.', 'success');
            setDeletingUser(null);
            loadUsers();
        } catch (error: any) {
            showToast('Erro ao excluir usuário: ' + (error.response?.data?.error || error.message), 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleResetPassword = async (email: string) => {
        try {
            await resetPassword(email);
            showToast("E-mail de redefinição enviado!", 'success');
        } catch (error: any) {
            showToast("Erro ao enviar e-mail: " + (error.response?.data?.error || error.message), 'error');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            password: '',
            profileId: profiles[0]?.id || '',
            unitId: ''
        });
    };

    const getProfileName = (id?: string) => profiles.find(p => p.id === id)?.name || 'Morador';

    if (!hasPermission(accessProfile, 'users', 'all')) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in duration-700">
                <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center shadow-inner border border-rose-100">
                    <Shield size={48} />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Acesso Restrito</h1>
                    <p className="text-slate-400 max-w-sm text-sm font-medium">Você não possui permissões administrativas para gerenciar a base de usuários do sistema.</p>
                </div>
                <HabitaButton onClick={() => window.history.back()} variant="outline" className="rounded-xl px-8 h-12 font-black uppercase tracking-widest text-[10px]">
                    Voltar para Segurança
                </HabitaButton>
            </div>
        );
    }

    return (
        <div className="w-full animate-in fade-in duration-500 pb-16">
            <HabitaContainer>
                <HabitaContainerHeader 
                    title="Gestão de Usuários"
                    subtitle="Administração de Contas e Níveis de Acesso"
                    icon={<Users size={24} />}
                    actions={
                        <>
                            <HabitaBadge variant="success" size="sm" className="hidden sm:flex h-9 px-4 font-black uppercase tracking-widest bg-emerald-50 border-emerald-100 text-emerald-700 shadow-sm">
                                <Shield size={14} className="mr-2" /> Admin Mode
                            </HabitaBadge>
                            <HabitaButton
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-slate-900 border-slate-900 text-white rounded-xl h-10 px-5 font-black uppercase tracking-widest text-[9px] shadow-lg shadow-slate-200 hover:scale-105 transition-all"
                                icon={<UserPlus size={16} />}
                            >
                                Novo Usuário
                            </HabitaButton>
                        </>
                    }
                />

                <HabitaContainerContent padding="md" className="overflow-visible">
                    <div className="space-y-6 flex-1 flex flex-col animate-in fade-in duration-500">
                        {/* Filter Bar */}
                        <div className="max-w-md">
                            <HabitaInput 
                                placeholder="Buscar por nome, email ou unidade..."
                                className="pl-11 h-11 bg-slate-50 border-slate-200 rounded-2xl text-sm font-medium transition-all"
                                icon={<Search size={18} className="text-slate-400" />}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 flex flex-col">
                            <HabitaTable responsive mobileVariant="list" containerClassName="border border-slate-200 shadow-sm overflow-visible h-full">
                                <HabitaTHead>
                                    <HabitaTR>
                                        <HabitaTH className="w-12"></HabitaTH>
                                        <HabitaTH>Usuário / Credencial</HabitaTH>
                                        <HabitaTH className="w-40">Perfil</HabitaTH>
                                        <HabitaTH className="w-24 text-center">Unidade</HabitaTH>
                                        <HabitaTH className="w-32">ID Ref</HabitaTH>
                                        <HabitaTH className="text-right w-32">Ações</HabitaTH>
                                    </HabitaTR>
                                </HabitaTHead>
                                <HabitaTBody>
                                    {isLoading ? (
                                        <HabitaTR>
                                            <HabitaTD colSpan={6} className="py-20 text-center">
                                                <HabitaSpinner size="lg" showLabel label="Sincronizando Base de Dados..." />
                                            </HabitaTD>
                                        </HabitaTR>
                                    ) : filteredUsers.length > 0 ? filteredUsers.map(u => (
                                        <HabitaTR key={u.uid}>
                                            {/* Mobile Layout */}
                                            <HabitaTD responsive={false} className="md:hidden block w-full py-4 px-4 border-b border-slate-50 last:border-none">
                                                <div className="flex flex-col gap-3 w-full">
                                                    <div className="flex justify-between items-start w-full gap-4">
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm shrink-0">
                                                                <User size={18} />
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-bold text-slate-900 text-sm leading-tight truncate">{u.name || 'Sem Nome'}</span>
                                                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest truncate">{u.email}</span>
                                                            </div>
                                                        </div>
                                                        <HabitaBadge 
                                                            variant={u.role === 'admin' ? 'error' : u.role === 'operator' ? 'warning' : 'neutral'}
                                                            size="xs"
                                                            className="uppercase text-[8px] font-black shrink-0 whitespace-nowrap"
                                                        >
                                                            {getProfileName(u.profileId)}
                                                        </HabitaBadge>
                                                    </div>

                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="flex items-center gap-3">
                                                            {u.unitId && (
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Unidade</span>
                                                                    <span className="text-[11px] font-black text-slate-700">
                                                                        UN {u.unitId?.split(/[-_]/).pop()}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <code className="text-[9px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                                #{u.uid.slice(0, 6).toUpperCase()}
                                                            </code>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <HabitaIconActionButton icon={<Edit />} variant="primary" size="sm" tooltip="Editar Perfil" onClick={() => handleEditUser(u)} />
                                                            <HabitaIconActionButton icon={<Key />} variant="warning" size="sm" tooltip="Redefinir Senha" onClick={() => handleResetPassword(u.email)} />
                                                            <HabitaIconActionButton icon={<Trash2 />} variant="danger" size="sm" tooltip="Excluir Usuário" onClick={() => setDeletingUser(u)} disabled={u.uid === user?.uid} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </HabitaTD>

                                            {/* Desktop Layout */}
                                            <HabitaTD className="hidden md:table-cell">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-200/60 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                                                    <User size={14} />
                                                </div>
                                            </HabitaTD>
                                            <HabitaTD className="hidden md:table-cell">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800 text-sm">{u.name || 'Sem Nome'}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">{u.email}</span>
                                                </div>
                                            </HabitaTD>
                                            <HabitaTD className="hidden md:table-cell">
                                                <HabitaBadge 
                                                    variant={u.role === 'admin' ? 'error' : u.role === 'operator' ? 'warning' : 'neutral'}
                                                    size="xs"
                                                    className="font-black text-[9px] uppercase tracking-widest border-none px-2.5"
                                                >
                                                    {getProfileName(u.profileId)}
                                                </HabitaBadge>
                                            </HabitaTD>
                                            <HabitaTD align="center" className="hidden md:table-cell">
                                                {u.unitId || (u.vinculos && u.vinculos.length > 0) ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black border border-indigo-100/50 inline-block">
                                                            UN {(u.unitId || u.vinculos?.[0]?.unitId)?.split(/[-_]/).pop()}
                                                        </div>
                                                        {u.vinculos && u.vinculos.length > 1 && (
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                                                                + {u.vinculos.length - 1} Vínculos
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : <span className="text-slate-300 font-black">—</span>}
                                            </HabitaTD>
                                            <HabitaTD className="hidden md:table-cell">
                                                <code className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                                    {u.uid.slice(0, 8).toUpperCase()}
                                                </code>
                                            </HabitaTD>
                                            <HabitaTD align="right" className="hidden md:table-cell">
                                                <div className="flex items-center justify-end gap-1 px-1">
                                                    <HabitaIconActionButton icon={<Edit />} variant="primary" size="sm" tooltip="Editar Perfil" onClick={() => handleEditUser(u)} />
                                                    <HabitaIconActionButton icon={<Key />} variant="warning" size="sm" tooltip="Redefinir Senha" onClick={() => handleResetPassword(u.email)} />
                                                    <HabitaIconActionButton icon={<Trash2 />} variant="danger" size="sm" tooltip="Excluir Usuário" onClick={() => setDeletingUser(u)} disabled={u.uid === user?.uid} />
                                                </div>
                                            </HabitaTD>
                                        </HabitaTR>
                                    )) : (
                                        <HabitaTR>
                                            <HabitaTD colSpan={6} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 border border-slate-100">
                                                        <Users size={32} />
                                                    </div>
                                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">Nenhum usuário encontrado na base.</p>
                                                </div>
                                            </HabitaTD>
                                        </HabitaTR>
                                    )}
                                </HabitaTBody>
                            </HabitaTable>
                        </div>

                        {/* Nota de Segurança Administrativa integrada na lista */}
                        <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex gap-5 text-slate-300 text-[11px] font-medium leading-relaxed shadow-xl animate-in slide-in-from-bottom-4 duration-700">
                            <AlertTriangle className="shrink-0 text-amber-500" size={20} />
                            <div>
                                <strong className="text-white uppercase tracking-widest text-[10px] block mb-1.5">Nota de Segurança Administrativa</strong>
                                <p>O registro e edição de usuários são operações críticas. Lembre-se que as senhas provisórias devem ser alteradas pelo usuário no primeiro acesso. Para auditorias avançadas ou logs de segurança, utilize o console de gerenciamento técnico do Habitar Pleno.</p>
                            </div>
                        </div>
                    </div>
                </HabitaContainerContent>
            </HabitaContainer>

            {/* Modal de Cadastro */}
            <HabitaModal
                isOpen={isCreateModalOpen}
                onClose={() => { resetForm(); setIsCreateModalOpen(false); }}
                title="Novo Registro de Usuário"
                size="lg"
                footer={
                    <div className="flex gap-3 w-full sm:w-auto">
                        <HabitaButton variant="outline" className="flex-1 sm:flex-none h-11 px-8 rounded-xl font-bold uppercase tracking-widest text-[10px]" onClick={() => { resetForm(); setIsCreateModalOpen(false); }}>
                            Descartar
                        </HabitaButton>
                        <HabitaButton
                            onClick={handleCreateUser}
                            isLoading={isProcessing}
                            icon={<UserPlus size={18} />}
                            className="flex-1 sm:flex-none bg-slate-900 border-slate-900 text-white h-11 px-8 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200"
                        >
                            Finalizar e Salvar
                        </HabitaButton>
                    </div>
                }
            >
                <form onSubmit={handleCreateUser} className="space-y-8 pb-32">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
                                    <Info size={18} />
                                </div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identidade</h4>
                            </div>
                            
                            <HabitaInput 
                                label="Nome Completo"
                                required 
                                placeholder="Ex: João da Silva"
                                value={formData.name}
                                onChange={(e: any) => setFormData(p => ({ ...p, name: e.target.value }))}
                                className="bg-slate-50/50 border-slate-200 h-12"
                            />
                            <HabitaInput 
                                label="E-mail principal"
                                type="email"
                                required 
                                placeholder="exemplo@habitat.com"
                                value={formData.email}
                                onChange={(e: any) => setFormData(p => ({ ...p, email: e.target.value }))}
                                className="bg-slate-50/50 border-slate-200 h-12"
                            />
                            <HabitaInput 
                                label="Telefone Corporativo"
                                placeholder="(11) 99999-9999"
                                value={formData.phone}
                                onChange={(e: any) => {
                                    let v = e.target.value.replace(/\D/g, '');
                                    if (v.length > 11) v = v.slice(0, 11);
                                    if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
                                    if (v.length > 10) v = `${v.slice(0, 10)}-${v.slice(10)}`;
                                    setFormData(p => ({ ...p, phone: v }));
                                }}
                                className="bg-slate-50/50 border-slate-200 h-12"
                            />
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
                                    <Shield size={18} />
                                </div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acesso & Regras</h4>
                            </div>
                            
                            <HabitaInput 
                                label="Senha de Primeiro Acesso"
                                type="password"
                                required 
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e: any) => setFormData(p => ({ ...p, password: e.target.value }))}
                                className="bg-slate-50/50 border-slate-200 h-12"
                            />
                            
                            <HabitaCombobox 
                                label="Perfil do Usuário"
                                value={formData.profileId}
                                onChange={(val) => setFormData(p => ({ ...p, profileId: val }))}
                                options={profiles.map(p => ({ value: p.id, label: p.name }))}
                                className="bg-slate-50/50 border-slate-200"
                            />
                            
                            <HabitaCombobox 
                                label="Unidade (Opcional)"
                                value={formData.unitId}
                                onChange={(val) => setFormData(p => ({ ...p, unitId: val }))}
                                options={units.map(u => {
                                    const displayLabel = u.number || u.id.split(/[-_]/).pop() || u.id;
                                    return { 
                                        value: u.id, 
                                        label: `Unidade ${displayLabel}${u.block ? ` (Bl ${u.block})` : ''}` 
                                    };
                                })}
                                placeholder="Vincular unidade..."
                                className="bg-slate-50/50 border-slate-200"
                            />
                        </div>
                    </div>
                </form>
            </HabitaModal>

            {/* Modal de Edição */}
            <HabitaModal
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
                title="Sincronização de Perfil"
                size="lg"
                footer={
                    <div className="flex gap-3 w-full sm:w-auto">
                        <HabitaButton variant="outline" className="flex-1 sm:flex-none h-11 px-8 rounded-xl font-bold uppercase tracking-widest text-[10px]" onClick={() => setEditingUser(null)}>
                            Cancelar
                        </HabitaButton>
                        <HabitaButton
                            onClick={handleSaveEdit}
                            isLoading={isProcessing}
                            icon={<Check size={18} />}
                            className="flex-1 sm:flex-none bg-slate-900 border-slate-900 text-white h-11 px-8 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200"
                        >
                            Efetivar Alterações
                        </HabitaButton>
                    </div>
                }
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-32">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                                <Info size={20} />
                            </div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dados do Colaborador</h4>
                        </div>
                        
                        <HabitaInput 
                            label="Nome Completo"
                            value={editFormData.name}
                            onChange={(e: any) => setEditFormData(p => ({ ...p, name: e.target.value }))}
                            className="bg-slate-50/50 border-slate-200 h-12"
                        />
                        <HabitaInput 
                            label="Telefone Habitual"
                            value={editFormData.phone}
                            onChange={(e: any) => {
                                let v = e.target.value.replace(/\D/g, '');
                                if (v.length > 11) v = v.slice(0, 11);
                                if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
                                if (v.length > 10) v = `${v.slice(0, 10)}-${v.slice(10)}`;
                                setEditFormData(p => ({ ...p, phone: v }));
                            }}
                            className="bg-slate-50/50 border-slate-200 h-12"
                        />
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                                <Shield size={20} />
                            </div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nível de Privilégio</h4>
                        </div>
                        
                        <HabitaCombobox 
                            label="Perfil de Segurança"
                            value={editFormData.profileId}
                            onChange={val => setEditFormData(p => ({ ...p, profileId: val }))}
                            options={profiles.map(p => ({ value: p.id, label: p.name }))}
                            className="bg-slate-50/50 border-slate-200"
                        />
                        <HabitaCombobox 
                            label="Vínculo com Unidade"
                            value={editFormData.unitId}
                            onChange={val => setEditFormData(p => ({ ...p, unitId: val }))}
                            options={units.map(u => {
                                const displayLabel = u.number || u.id.split(/[-_]/).pop() || u.id;
                                return { 
                                    value: u.id, 
                                    label: `Unidade ${displayLabel}${u.block ? ` (Bl ${u.block})` : ''}` 
                                };
                            })}
                            placeholder="Nenhuma unidade selecionada"
                            className="bg-slate-50/50 border-slate-200"
                        />
                    </div>
                </div>
            </HabitaModal>

            {/* Modal de Exclusão */}
            <HabitaModal
                isOpen={!!deletingUser}
                onClose={() => setDeletingUser(null)}
                title="Revogar Acesso?"
                size="sm"
                footer={
                    <div className="flex gap-3 w-full">
                        <HabitaButton variant="outline" className="flex-1 h-11 rounded-xl font-bold uppercase tracking-widest text-[10px]" onClick={() => setDeletingUser(null)}>
                            Manter Usuário
                        </HabitaButton>
                        <HabitaButton
                            variant="danger"
                            onClick={confirmDelete}
                            isLoading={isProcessing}
                            icon={<Trash2 size={18} />}
                            className="flex-1 bg-rose-600 border-rose-600 text-white h-11 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-rose-100"
                        >
                            Confirmar Remoção
                        </HabitaButton>
                    </div>
                }
            >
                <div className="text-center py-4 space-y-6">
                    <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-rose-100 animate-pulse">
                        <Trash2 size={40} />
                    </div>
                    <div className="space-y-4">
                        <p className="text-slate-600 font-bold text-sm leading-relaxed px-4">
                            Deseja realmente remover o perfil de <strong>{deletingUser?.name || deletingUser?.email}</strong>?
                        </p>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-[10px] text-slate-400 leading-relaxed font-black uppercase text-left tracking-widest flex gap-3 shadow-inner">
                            <Shield className="text-rose-500 shrink-0" size={16} />
                            <p>Atenção: Esta ação remove os dados do banco Firestore. O usuário manterá sua credencial de login ativa até que seja revogada no painel de segurança.</p>
                        </div>
                    </div>
                </div>
            </HabitaModal>
        </div>
    );
};

export default UsersPage;
