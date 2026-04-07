import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Trash2, Building, Pencil, Users, UploadCloud, Car, UserPlus, Search, Shield, ShieldAlert, RefreshCw, WifiOff } from 'lucide-react';
import { HabitaSpinner } from '../components/ui/HabitaSpinner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Inline AccessProfile type (rbac.ts doesn't exist yet)
export interface AccessProfile {
    id: string;
    name: string;
    permissions: Record<string, string>;
}

// Permission helper fallback
const hasPermission = (profile: AccessProfile | null, module: string, level: string): boolean => {
    if (!profile?.permissions) return false;
    const perm = profile.permissions[module];
    if (level === 'own') return perm === 'own' || perm === 'all';
    return perm === level;
};

const getRoleFromProfile = (profile: AccessProfile): string => {
    if (profile.id.includes('sindico') || profile.id.includes('admin')) return 'admin';
    if (profile.id.includes('porteiro') || profile.id.includes('zelador')) return 'staff';
    return 'resident';
};

import { ImportUnitsModal } from '../components/ImportUnitsModal';

import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaInput, HabitaSelect } from '../components/ui/HabitaForm';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaTable, HabitaTHead, HabitaTBody, HabitaTR, HabitaTH, HabitaTD } from '../components/ui/HabitaTable';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaCombobox } from '../components/ui/HabitaCombobox';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { HabitaIconActionButton } from '../components/ui/HabitaIconActionButton';
import { HabitaStatGrid } from '../components/ui/HabitaStatGrid';

// Missing standard types
export interface Dependente {
    nome: string;
    tipo: string;
    observacoes?: string;
}

export interface Vehicle {
    plate: string;
    model: string;
    color: string;
    parkingSpace?: string;
}

export interface Unit {
    id: string;
    block?: string;
    ownerName: string;
    ownerEmail?: string;
    ownerId?: string;
    ownerContact?: string;
    typeId: string;
    residentType?: 'owner' | 'tenant';
    tenantName?: string;
    tenantEmail?: string;
    tenantId?: string;
    dependentes?: Dependente[];
    vehicles?: Vehicle[];
    currentGasReading?: number;
    lastGasReading?: number;
    [key: string]: any;
}

export interface UserProfile {
    uid: string;
    name: string;
    email: string;
    role: string;
    vinculos?: any[];
}
import { useApp } from '../contexts';

const UnitsPage = () => {
    const { 
        visibleUnits: units,
        settings, 
        reloadCondoData,
        error: contextError,
        users: allSystemUsers,
        profiles: allProfiles
    } = useApp();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!error && contextError) setError(contextError);

    // === AUTH CONTEXT (window proxy) ===
    const authCtx = (window as any).authContext || {};
    const accessProfile: AccessProfile | null = authCtx.accessProfile || null;
    const profile = authCtx.profile || null;
    const isAdmin: boolean = authCtx.isAdmin ?? false;

    const canManageUnits = hasPermission(accessProfile, 'units', 'all') || isAdmin;
    const showToast: (msg: string, type: string) => void =
        (window as any).showToast || ((msg: string) => alert(msg));

    // --- UNIFIED STATE ---
    // Form State (New Unit)
    const [unitNumber, setUnitNumber] = useState('');
    const [block, setBlock] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [typeId, setTypeId] = useState('');

    // Edit State (Exist Unit)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [editOwnerName, setEditOwnerName] = useState('');
    const [editOwnerEmail, setEditOwnerEmail] = useState('');
    const [editTypeId, setEditTypeId] = useState('');
    const [residentType, setResidentType] = useState<'owner' | 'tenant'>('owner');
    const [tenantName, setTenantName] = useState('');
    const [tenantEmail, setTenantEmail] = useState('');
    const [editTenantId, setEditTenantId] = useState<string | undefined>(undefined);
    const [editOwnerId, setEditOwnerId] = useState<string|undefined>(undefined);
    const [ownerContact, setOwnerContact] = useState('');

    // Residents Modal State
    const [showResidentsModal, setShowResidentsModal] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
    const [depName, setDepName] = useState('');
    const [depType, setDepType] = useState('Filho(a)');
    const [depObs, setDepObs] = useState('');
    
    // Residents Modal State
    
    // Vehicle Form State
    const [vehPlate, setVehPlate] = useState('');
    const [vehModel, setVehModel] = useState('');
    const [vehColor, setVehColor] = useState('');
    const [vehParkingSpace, setVehParkingSpace] = useState('');

    // UI Misc
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form: User Association (Accounts)
    const [assocEmail, setAssocEmail] = useState('');
    const [assocProfileId, setAssocProfileId] = useState('');
    const [isAssocProcessing, setIsAssocProcessing] = useState(false);

    const loadData = async () => {
        setIsLoading(true);
        try {
            await reloadCondoData();
        } catch (err: any) {
            showToast('Erro ao carregar dados.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (units.length === 0) {
            loadData();
        }
    }, []);

    const handleAssociateUser = async () => {
        if (!selectedUnit || !assocEmail || !assocProfileId) {
            showToast('Preencha o email e selecione um perfil', 'warning');
            return;
        }

        setIsAssocProcessing(true);
        try {
            const checkRes = await api.get(`/users/email/${assocEmail}`);
            const targetUser = checkRes.data?.data ?? checkRes.data;

            if (!targetUser) {
                showToast('Usuário não encontrado com este e-mail.', 'error');
                return;
            }

            const selectedProfile = allProfiles.find(p => p.id === assocProfileId);
            const role = selectedProfile ? getRoleFromProfile(selectedProfile) : 'resident';

            await api.post(`/users/${targetUser.uid}/vinculos`, {
                role,
                profileId: assocProfileId,
                unitId: selectedUnit.id
            });
            
            showToast(`Conta de ${targetUser.name || targetUser.email} vinculada com sucesso!`, 'success');
            setAssocEmail('');
            loadData(); // Sync list
        } catch (error: any) {
            showToast('Erro ao vincular conta: ' + (error.response?.data?.error || error.message), 'error');
        } finally {
            setIsAssocProcessing(false);
        }
    };

    const sortedUnits = React.useMemo(() => {
        let filtered: Unit[] = units;
        
        // Context filtering
        if (!isAdmin && profile?.role === 'resident' && profile?.unitId) {
            filtered = units.filter((u: Unit) => u.id === profile.unitId);
        }

        // Search filtering
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter((u: Unit) => 
                u.id.toLowerCase().includes(term) ||
                (u.block && u.block.toLowerCase().includes(term)) ||
                u.ownerName.toLowerCase().includes(term)
            );
        }

        return [...filtered].sort((a, b) => {
            const blockA = (a.block || '').trim().toUpperCase();
            const blockB = (b.block || '').trim().toUpperCase();
            const blockRes = blockA.localeCompare(blockB, undefined, { numeric: true, sensitivity: 'base' });
            if (blockRes !== 0) return blockRes;

            const unitNumA = String(a.number || a.Numero || (a.id.includes('-') ? a.id.split('-')[0] : a.id)).trim();
            const unitNumB = String(b.number || b.Numero || (b.id.includes('-') ? b.id.split('-')[0] : b.id)).trim();
            return unitNumA.localeCompare(unitNumB, undefined, { numeric: true, sensitivity: 'base' });
        });
    }, [units, searchTerm, isAdmin, profile]);

    const getActiveUsersForUnit = (unitId: string) => {
        return allSystemUsers.filter(user =>
            user.vinculos?.some((v: any) => v.unitId === unitId)
        );
    };

    /**
     * Identifica em tempo real quem é o responsável atual para faturamento.
     * Prioriza a conta de sistema vinculada se existir.
     */
    const getResponsavelDaUnidade = (unitId: string): {
        nome: string;
        email?: string;
        tipo: 'inquilino' | 'proprietario' | 'sem_cadastro';
        hasAccount: boolean;
        inquilino?: UserProfile;
        proprietario?: UserProfile;
    } => {
        const unit = units.find(u => u.id === unitId);
        const vinculados = getActiveUsersForUnit(unitId);
        
        // Find system accounts for both roles if they exist
        const regInquilino = vinculados.find(u => {
            const vinculo = u.vinculos?.find((v: any) => v.unitId === unitId);
            return vinculo?.profileId?.toLowerCase().includes('inquilino');
        });

        const regProprietario = vinculados.find(u => {
            const vinculo = u.vinculos?.find((v: any) => v.unitId === unitId);
            return vinculo?.profileId?.toLowerCase().includes('proprietario');
        });

        // Use the unit's ResidentType to determine the primary responsible
        const isTenantMode = unit?.residentType === 'tenant';

        if (isTenantMode) {
            // Prioritize registered tenant, then manual tenant name
            if (regInquilino) {
                return { 
                    nome: regInquilino.name || regInquilino.email, 
                    email: regInquilino.email, 
                    tipo: 'inquilino', 
                    hasAccount: true,
                    inquilino: regInquilino, 
                    proprietario: regProprietario 
                };
            }
            if (unit?.tenantName) {
                return { 
                    nome: unit.tenantName, 
                    email: unit.tenantEmail, 
                    tipo: 'inquilino', 
                    hasAccount: false,
                    proprietario: regProprietario 
                };
            }
        }

        // Default or Owner Mode: Prioritize registered owner, then legacy owner
        if (regProprietario) {
            return { 
                nome: regProprietario.name || regProprietario.email, 
                email: regProprietario.email, 
                tipo: 'proprietario', 
                hasAccount: true,
                proprietario: regProprietario, 
                inquilino: regInquilino 
            };
        }

        if (unit?.ownerName) {
            return { 
                nome: unit.ownerName, 
                email: unit.ownerEmail,
                tipo: 'proprietario',
                hasAccount: false,
                inquilino: regInquilino 
            };
        }

        // Absolute fallback: first linked user found
        if (vinculados.length > 0) {
            const first = vinculados[0];
            return { 
                nome: first.name || first.email, 
                email: first.email, 
                tipo: 'proprietario', 
                hasAccount: true,
                proprietario: first 
            };
        }

        return { nome: 'Sem titular', tipo: 'sem_cadastro', hasAccount: false };
    };

    const startEditing = (unit: Unit) => {
        const resp = getResponsavelDaUnidade(unit.id);
        
        setEditingUnit(unit);
        setEditOwnerName(resp.proprietario?.name || unit.ownerName);
        setEditOwnerEmail(resp.proprietario?.email || unit.ownerEmail || '');
        setEditOwnerId(resp.proprietario?.uid || unit.ownerId);

        setEditTypeId(unit.typeId);
        setResidentType(unit.residentType || 'owner');
        
        setTenantName(resp.inquilino?.name || unit.tenantName || '');
        setTenantEmail(resp.inquilino?.email || unit.tenantEmail || '');
        setEditTenantId(resp.inquilino?.uid || unit.tenantId);

        setOwnerContact(unit.ownerContact || '');
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingUnit || !editOwnerName.trim()) {
            showToast('O nome do titular/proprietário é obrigatório.', 'warning');
            return;
        }

        try {
            const updatedUnit = {
                ...editingUnit,
                ownerName: editOwnerName.trim(),
                ownerEmail: editOwnerEmail.trim(),
                ownerId: editOwnerId,
                typeId: editTypeId,
                residentType,
                tenantName: residentType === 'tenant' ? (tenantName || '') : '',
                tenantEmail: residentType === 'tenant' ? (tenantEmail || '') : '',
                tenantId: residentType === 'tenant' ? (editTenantId || undefined) : undefined,
                ownerContact: residentType === 'tenant' ? (ownerContact || '') : ''
            };

            await api.put(`/units/${editingUnit.id}`, updatedUnit);

            // Automatic RBAC "Amarração": Se houver uma conta vinculada, garante o perfil semeado correto
            if (residentType === 'tenant' && editTenantId) {
                const profileId = `perfil_inquilino`;
                await api.post(`/users/${editTenantId}/vinculos`, {
                    profileId,
                    unitId: editingUnit.id
                });
            } else if (residentType === 'owner' && editOwnerId) {
                const profileId = `perfil_proprietario`;
                await api.post(`/users/${editOwnerId}/vinculos`, {
                    profileId,
                    unitId: editingUnit.id
                });
            }

            showToast('Unidade atualizada e perfis sincronizados!', 'success');
            setIsEditModalOpen(false);
            setEditingUnit(null);
            loadData();
        } catch (error) {
            console.error('Save Unit Error:', error);
            showToast('Erro ao atualizar unidade.', 'error');
        }
    };

    const handleAddDependent = async () => {
        if (!selectedUnit || !depName.trim() || !depType.trim()) {
            showToast('Nome e tipo são obrigatórios!', 'warning');
            return;
        }

        const newDep: Dependente = {
            nome: depName.trim(),
            tipo: depType.trim(),
            observacoes: depObs.trim()
        };

        try {
            await api.post(`/units/${selectedUnit.id}/dependents`, newDep);
            
            showToast('Morador adicionado!', 'success');
            setDepName('');
            setDepObs('');
            loadData();
            
            // Re-select unit from local units to update the modal view
            const updatedUnitsRes = await api.get('/units');
            const freshUnits: Unit[] = updatedUnitsRes.data?.data ?? updatedUnitsRes.data ?? [];
            const updatedUnit = freshUnits.find((u: Unit) => u.id === selectedUnit.id);
            if (updatedUnit) setSelectedUnit(updatedUnit);

        } catch (error) {
            showToast('Erro ao adicionar morador.', 'error');
        }
    };

    const handleRemoveDependent = async (index: number) => {
        if (!selectedUnit || !selectedUnit.dependentes) return;

        try {
            await api.delete(`/units/${selectedUnit.id}/dependents/${index}`);
            
            showToast('Morador removido!', 'success');
            loadData();
            
            const updatedUnitsRes = await api.get('/units');
            const freshUnits: Unit[] = updatedUnitsRes.data?.data ?? updatedUnitsRes.data ?? [];
            const updatedUnit = freshUnits.find((u: Unit) => u.id === selectedUnit.id);
            if (updatedUnit) setSelectedUnit(updatedUnit);
        } catch (error) {
            showToast('Erro ao remover morador.', 'error');
        }
    };

    const handleAddVehicle = async () => {
        if (!selectedUnit || !vehPlate.trim() || !vehModel.trim()) {
            showToast('Placa e modelo são obrigatórios!', 'warning');
            return;
        }

        const newVehicle: Vehicle = {
            plate: vehPlate.trim().toUpperCase(),
            model: vehModel.trim(),
            color: vehColor.trim(),
            parkingSpace: vehParkingSpace.trim() || undefined,
        };

        try {
            await api.post(`/units/${selectedUnit.id}/vehicles`, newVehicle);
            
            showToast('Veículo adicionado!', 'success');
            setVehPlate('');
            setVehModel('');
            setVehColor('');
            setVehParkingSpace('');
            loadData();
            
            const updatedUnitsRes = await api.get('/units');
            const freshUnits: Unit[] = updatedUnitsRes.data?.data ?? updatedUnitsRes.data ?? [];
            const updatedUnit = freshUnits.find((u: Unit) => u.id === selectedUnit.id);
            if (updatedUnit) setSelectedUnit(updatedUnit);
        } catch (error) {
            showToast('Erro ao adicionar veículo.', 'error');
        }
    };

    const handleRemoveVehicle = async (index: number) => {
        if (!selectedUnit || !selectedUnit.vehicles) return;

        try {
            await api.delete(`/units/${selectedUnit.id}/vehicles/${index}`);
            
            showToast('Veículo removido!', 'success');
            loadData();
            
            const updatedUnitsRes = await api.get('/units');
            const freshUnits: Unit[] = updatedUnitsRes.data?.data ?? updatedUnitsRes.data ?? [];
            const updatedUnit = freshUnits.find((u: Unit) => u.id === selectedUnit.id);
            if (updatedUnit) setSelectedUnit(updatedUnit);
        } catch (error) {
            showToast('Erro ao remover veículo.', 'error');
        }
    };

    const handleAddUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!unitNumber || !ownerName || !typeId) {
            showToast('Preencha os campos obrigatórios!', 'warning');
            return;
        }

        const bStr = block.trim().toUpperCase();
        const finalId = bStr ? `${unitNumber.trim()}-${bStr}` : unitNumber.trim();

        // Check for duplicate ID
        if (units.some(u => u.id === finalId)) {
            showToast('Esta unidade já existe!', 'error');
            return;
        }

        const newUnit: Unit = {
            id: finalId,
            ownerName,
            typeId,
            currentGasReading: 0,
            lastGasReading: 0,
            residentType: 'owner' // Padrão ao cadastrar novo
        };

        if (bStr) {
            newUnit.block = bStr;
        }

        try {
            await api.post('/units', newUnit);
            showToast('Unidade cadastrada com sucesso!', 'success');
            loadData();

            // Reset form
            setUnitNumber('');
            setBlock('');
            setOwnerName('');
            setTypeId('');
        } catch (error) {
            showToast('Erro ao cadastrar unidade.', 'error');
        }
    };

    const getTypeName = (id: string) => {
        return settings.unitTypes.find(t => t.id === id)?.name || 'Desconhecido';
    };

    // === FULLSCREEN ERROR STATE ===
    if (!isLoading && error) {
        return (
            <div className="w-full animate-in fade-in duration-500 pb-12">
                <HabitaContainer>
                    <HabitaContainerHeader
                        title="Unidades e Moradores"
                        subtitle="Gestão de ocupação, tipologias e veículos"
                        icon={<Building size={24} />}
                    />
                    <HabitaContainerContent padding="none">
                        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6 space-y-6">
                            <div className="w-20 h-20 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center shadow-sm">
                                <WifiOff size={36} className="text-rose-400" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Falha na Conexão</h2>
                                <p className="text-sm text-slate-500 max-w-md leading-relaxed">
                                    Não foi possível carregar os dados das unidades. Verifique sua conexão ou tente novamente.
                                </p>
                                <p className="text-[10px] font-mono text-rose-400 bg-rose-50 border border-rose-100 rounded-lg px-4 py-2 mt-3 inline-block">
                                    {error}
                                </p>
                            </div>
                            <HabitaButton
                                onClick={loadData}
                                variant="primary"
                                icon={<RefreshCw size={18} />}
                                className="bg-slate-900 border-slate-900 shadow-lg shadow-slate-200 mt-2"
                            >
                                Tentar Novamente
                            </HabitaButton>
                        </div>
                    </HabitaContainerContent>
                </HabitaContainer>
            </div>
        );
    }

    return (
        <div className="w-full animate-in fade-in duration-500 pb-12">
            <HabitaContainer>
                <HabitaContainerHeader 
                    title="Unidades e Moradores"
                    subtitle="Gestão de ocupação, tipologias e veículos"
                    icon={<Building size={24} />}
                    actions={
                        canManageUnits && (
                            <HabitaButton
                                onClick={() => setIsImportModalOpen(true)}
                                variant="outline"
                                icon={<UploadCloud size={18} />}
                            >
                                Importar em Lote
                            </HabitaButton>
                        )
                    }
                />

                <HabitaContainerContent padding="none">
                    <div className="p-3 md:p-8 flex flex-col gap-4 md:gap-8">
                        {/* Mobile KPIs */}
                        <div className="md:hidden">
                            <HabitaStatGrid 
                                title="Resumo do Condomínio"
                                icon={<Users />}
                                metrics={[
                                    {
                                        label: "UNIDADES",
                                        value: units.length,
                                        icon: <Building />,
                                        variant: "indigo",
                                        subtext: "Cadastradas"
                                    },
                                    {
                                        label: "OCUPADAS",
                                        value: units.filter((u: Unit) => u.ownerName || u.tenantName).length,
                                        icon: <Users />,
                                        variant: "emerald",
                                        subtext: "Com Morador"
                                    },
                                    {
                                        label: "MORADORES",
                                        value: units.reduce((acc: number, u: Unit) => acc + (u.dependentes?.length || 0) + (u.ownerName ? 1 : 0), 0),
                                        icon: <Users />,
                                        variant: "amber",
                                        subtext: "Total Geral"
                                    },
                                    {
                                        label: "VEÍCULOS",
                                        value: units.reduce((acc: number, u: Unit) => acc + (u.vehicles?.length || 0), 0),
                                        icon: <Car />,
                                        variant: "indigo",
                                        subtext: "Registrados"
                                    }
                                ]}
                            />
                        </div>

                        {/* Desktop KPIs */}
                        <div className="hidden md:block">
                             <HabitaStatGrid 
                                title="Indicadores de Ocupação e Registro"
                                icon={<Building />}
                                metrics={[
                                    {
                                        label: "TOTAL DE UNIDADES",
                                        value: units.length,
                                        icon: <Building />,
                                        variant: "slate",
                                        subtext: "Banco de Dados"
                                    },
                                    {
                                        label: "TAXA DE OCUPAÇÃO",
                                        value: units.length > 0 ? `${Math.round((units.filter((u: Unit) => u.ownerName || u.tenantName).length / units.length) * 100)}%` : '0%',
                                        icon: <Users />,
                                        variant: "emerald",
                                        subtext: "Unidades Ativas"
                                    },
                                    {
                                        label: "DENSIDADE POPULACIONAL",
                                        value: units.reduce((acc: number, u: Unit) => acc + (u.dependentes?.length || 0) + (u.ownerName ? 1 : 0), 0),
                                        icon: <Users />,
                                        variant: "indigo",
                                        subtext: "Indivíduos"
                                    },
                                    {
                                        label: "FROTA REGISTRADA",
                                        value: units.reduce((acc: number, u: Unit) => acc + (u.vehicles?.length || 0), 0),
                                        icon: <Car />,
                                        variant: "amber",
                                        subtext: "Veículos Totais"
                                    }
                                ]}
                                cols={4}
                            />
                        </div>

                        {/* Filter Panel / Nova Unidade */}
                    {canManageUnits && (
                        <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-6">
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Plus size={14} className="text-emerald-500" /> Registrar Nova Unidade
                            </h2>
                            <form onSubmit={handleAddUnit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                                <HabitaInput
                                    label="Número"
                                    value={unitNumber}
                                    onChange={(e) => setUnitNumber(e.target.value)}
                                    placeholder="Ex: 101"
                                    required
                                />
                                <HabitaInput
                                    label="Bloco (Opcional)"
                                    value={block}
                                    onChange={(e) => setBlock(e.target.value)}
                                    placeholder="Ex: A"
                                />
                                <HabitaInput
                                    label="Titular / Proprietário"
                                    value={ownerName}
                                    onChange={(e) => setOwnerName(e.target.value)}
                                    placeholder="Nome Completo"
                                    required
                                />
                                <HabitaCombobox
                                    label="Tipologia"
                                    options={settings.unitTypes.map(t => ({ label: t.name.toUpperCase(), value: t.id }))}
                                    value={typeId}
                                    onChange={setTypeId}
                                    placeholder="Selecione..."
                                />
                                <HabitaButton
                                    type="submit"
                                    variant="primary"
                                    icon={<Plus size={18} />}
                                    className="bg-slate-900 border-slate-900"
                                >
                                    Cadastrar
                                </HabitaButton>
                            </form>
                        </div>
                    )}

            {/* Units Table - Enterprise Style */}
            <div className="bg-white overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                <div className="p-4 md:p-6 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Building size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Inventário de Unidades Registradas</span>
                    </div>
                    
                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors z-10" size={16} />
                        <HabitaInput
                            placeholder="Buscar por unidade, bloco ou titular..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-10 text-xs shadow-sm bg-white border-slate-200"
                            containerClassName="w-full"
                        />
                    </div>
                </div>

                <HabitaTable 
                    responsive
                    mobileVariant="list"
                    isEmpty={sortedUnits.length === 0}
                    emptyMessage="Nenhuma unidade encontrada no registro."
                    containerClassName="border-none rounded-none shadow-none"
                >
                    <HabitaTHead>
                        <HabitaTR>
                            <HabitaTH className="w-32 text-center">Unidade</HabitaTH>
                            <HabitaTH className="w-32 text-center">Bloco</HabitaTH>
                            <HabitaTH className="w-auto text-left">Titular Responsável</HabitaTH>
                            <HabitaTH className="w-40 text-center">Tipologia</HabitaTH>
                            { (canManageUnits || (!isAdmin && profile?.role === 'resident')) && (
                                <HabitaTH className="w-24 text-center">Ações</HabitaTH>
                            )}
                        </HabitaTR>
                    </HabitaTHead>
                    <HabitaTBody>
                        {isLoading ? (
                            <HabitaTR>
                                <HabitaTD colSpan={6} className="p-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <HabitaSpinner size="lg" />
                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Sincronizando Base Operacional...</span>
                                    </div>
                                </HabitaTD>
                            </HabitaTR>
                        ) : sortedUnits.map((unit) => (
                            <HabitaTR key={unit.id} className="group">
                                {/* Mobile Layout - Unified Standard */}
                                <HabitaTD responsive={false} className="md:hidden block w-full py-2.5 border-b-0">
                                    <div className="flex flex-col gap-2 w-full">
                                        <div className="flex justify-between items-start w-full">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-700 text-sm leading-tight tracking-tight">
                                                        Unidade {unit.id || '-'}
                                                    </span>
                                                    {unit.block && (
                                                        <HabitaBadge variant="neutral" size="xs" className="font-black tracking-widest bg-slate-100 border-slate-200">
                                                            BL {unit.block}
                                                        </HabitaBadge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {(() => {
                                                        const resp = getResponsavelDaUnidade(unit.id);
                                                        const isInquilino = resp.tipo === 'inquilino';
                                                        const hasAccount = (resp as any).hasAccount;
                                                        
                                                        let badgeColor = "bg-slate-400 text-white border-transparent";
                                                        if (hasAccount) {
                                                            badgeColor = isInquilino ? "bg-blue-500 text-white border-transparent" : "bg-emerald-500 text-white border-transparent shadow-sm";
                                                        } else {
                                                            // Sem conta vinculada
                                                            badgeColor = isInquilino ? "bg-amber-500 text-white border-transparent" : "bg-slate-400 text-white border-transparent";
                                                        }

                                                        return (
                                                            <>
                                                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">
                                                                    {resp.nome}
                                                                </span>
                                                                <HabitaBadge 
                                                                    variant="neutral" 
                                                                    size="xs" 
                                                                    className={cn(
                                                                        "text-[8px] font-black tracking-widest px-1.5 h-4",
                                                                        badgeColor
                                                                    )}
                                                                >
                                                                    {isInquilino ? 'INQUILINO' : 'PROPRIETÁRIO'}
                                                                    {!hasAccount ? ' (MANUAL)' : ''}
                                                                </HabitaBadge>
                                                                {isInquilino && resp.proprietario && (
                                                                    <span className="text-[9px] text-slate-400 font-normal mt-0.5 ml-1">Prop: {resp.proprietario.name || resp.proprietario.email}</span>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <HabitaBadge variant="neutral" size="xs">
                                                    {getTypeName(unit.typeId).toUpperCase()}
                                                </HabitaBadge>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center w-full pt-1">
                                            <div className="flex-1 flex flex-wrap gap-1.5 overflow-hidden pr-4">
                                                {getActiveUsersForUnit(unit.id).length > 0 && (
                                                    <HabitaBadge variant="success" size="xs">
                                                        <Users size={10} className="mr-1" />
                                                        {getActiveUsersForUnit(unit.id).length} Ativos
                                                    </HabitaBadge>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-2 ml-auto shrink-0">
                                                <HabitaIconActionButton icon={<Users />} variant="primary" size="md" tooltip="Gerenciar Moradores" onClick={() => { setSelectedUnit(unit); setShowResidentsModal(true); }} />
                                                {canManageUnits && (
                                                    <HabitaIconActionButton icon={<Trash2 />} variant="danger" size="md" tooltip="Excluir" onClick={() => setUnitToDelete(unit)} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </HabitaTD>

                                {/* Desktop Layout */}
                                <HabitaTD label="Unidade" className="hidden md:table-cell font-bold text-slate-900 text-sm tracking-tight text-center">
                                    {unit.id || '-'}
                                </HabitaTD>
                                <HabitaTD label="Bloco" className="hidden md:table-cell font-bold text-slate-500 text-sm tracking-widest text-center">
                                    {unit.block || '-'}
                                </HabitaTD>
                                <HabitaTD label="Titular / Morador" className="hidden md:table-cell font-normal text-slate-700 text-left">
                                    {(() => {
                                        const resp = getResponsavelDaUnidade(unit.id);
                                        const isInquilino = resp.tipo === 'inquilino';
                                        const hasAccount = (resp as any).hasAccount;

                                        let badgeColor = "bg-slate-400 text-white border-transparent";
                                        if (hasAccount) {
                                            badgeColor = isInquilino ? "bg-blue-500 text-white border-transparent shadow-sm" : "bg-emerald-500 text-white border-transparent shadow-sm";
                                        } else {
                                            // Sem conta vinculada
                                            badgeColor = isInquilino ? "bg-amber-500 text-white border-transparent shadow-sm" : "bg-slate-400 text-white border-transparent shadow-sm";
                                        }

                                        return (
                                            <div className="flex flex-col group/name min-h-[42px] justify-center">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-slate-900 tracking-tight">
                                                        {resp.nome}
                                                    </span>
                                                    <HabitaBadge
                                                        variant="neutral"
                                                        size="xs"
                                                        className={cn(
                                                            "text-[8px] font-black tracking-widest px-1.5 h-4",
                                                            badgeColor
                                                        )}
                                                    >
                                                        {isInquilino ? 'INQUILINO' : 'PROPRIETÁRIO'}
                                                        {!hasAccount ? ' (MANUAL)' : ''}
                                                    </HabitaBadge>
                                                    {canManageUnits && (
                                                        <HabitaIconActionButton icon={<Pencil />} variant="ghost" size="xs" tooltip="Editar Unidade" onClick={() => startEditing(unit)} className="opacity-0 group-hover/name:opacity-100 transition-opacity h-4 w-4" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {resp.email && <span className="text-[10px] text-slate-400 font-medium lowercase italic">{resp.email}</span>}
                                                    {isInquilino && resp.proprietario && (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1 h-3 bg-indigo-200 rounded-full" />
                                                            <span className="text-[9px] text-slate-400 font-normal">Prop: {resp.proprietario.name || resp.proprietario.email}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    {/* Active Users Badges */}
                                    {getActiveUsersForUnit(unit.id).length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {getActiveUsersForUnit(unit.id).map(u => (
                                                <HabitaBadge key={u.uid} variant="success" size="xs">
                                                    <Users size={10} className="mr-1 opacity-70" />
                                                    {u.name || u.email.split('@')[0]}
                                                </HabitaBadge>
                                            ))}
                                        </div>
                                    )}
                                </HabitaTD>
                                <HabitaTD label="Tipologia" className="hidden md:table-cell text-center">
                                    <HabitaBadge variant="neutral" size="xs">
                                        {getTypeName(unit.typeId)}
                                    </HabitaBadge>
                                </HabitaTD>
                                { (canManageUnits || (!isAdmin && profile?.role === 'resident' && profile?.unitId === unit.id)) && (
                                    <HabitaTD label="Ações" className="hidden md:table-cell text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <HabitaIconActionButton icon={<Users />} variant="primary" size="sm" tooltip="Gerenciar Moradores" onClick={() => { setSelectedUnit(unit); setShowResidentsModal(true); }} />
                                            {canManageUnits && (
                                                <HabitaIconActionButton icon={<Trash2 />} variant="danger" size="sm" tooltip="Excluir" onClick={() => setUnitToDelete(unit)} />
                                            )}
                                        </div>
                                    </HabitaTD>
                                )}
                            </HabitaTR>
                        ))}
                    </HabitaTBody>
                </HabitaTable>

                <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex justify-between items-center">
                    <span>Ocupação Total: <strong className="text-slate-600 ml-1">{units.length} Unidades</strong></span>
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Link Sincronizado</span>
                </div>
                </div>
            </div>

                </HabitaContainerContent>
            </HabitaContainer>

            {/* Residents / Family Composition Modal */}
            <HabitaModal
                isOpen={showResidentsModal}
                onClose={() => setShowResidentsModal(false)}
                title={`Gestão da Unidade ${selectedUnit?.id}`}
                size="lg"
            >
                {selectedUnit && (
                    <div className="space-y-6">
                        {/* Occupation Mode Banner - driven by registered users */}
                        {(() => {
                            const resp = getResponsavelDaUnidade(selectedUnit.id);
                            const isInquilino = resp.tipo === 'inquilino';
                            const isSemCadastro = resp.tipo === 'sem_cadastro';
                            return (
                                <div className={cn(
                                    "p-4 rounded-xl border flex items-center justify-between gap-4",
                                    isInquilino ? "bg-amber-50 border-amber-200" : isSemCadastro ? "bg-slate-50 border-slate-200" : "bg-indigo-50 border-indigo-100"
                                )}>
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                            isInquilino ? "bg-amber-100 text-amber-600" : isSemCadastro ? "bg-slate-100 text-slate-400" : "bg-indigo-100 text-indigo-600"
                                        )}>
                                            <Shield size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Titular Responsável (Fatura)</p>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <span className={cn(
                                                    "text-sm font-black",
                                                    isInquilino ? "text-blue-700" : "text-emerald-700"
                                                )}>
                                                    {isInquilino ? 'Inquilino:' : 'Proprietário:'}
                                                </span>
                                                <span className="text-sm font-bold text-slate-800">{resp.nome}</span>
                                                <HabitaBadge
                                                    variant="neutral"
                                                    size="xs"
                                                    className={cn(
                                                        "text-[7px] font-black border-transparent",
                                                        (resp as any).hasAccount 
                                                            ? (isInquilino ? "bg-blue-500 text-white" : "bg-emerald-500 text-white")
                                                            : (isInquilino ? "bg-amber-500 text-white" : "bg-slate-400 text-white")
                                                    )}
                                                >
                                                    {(resp as any).hasAccount ? 'CONTA VINCULADA' : 'CADASTRO MANUAL'}
                                                </HabitaBadge>
                                            </div>
                                            {isInquilino && resp.proprietario && (
                                                <p className="text-[9px] text-slate-500 mt-0.5">
                                                    Proprietário: <span className="font-bold">{resp.proprietario.name || resp.proprietario.email}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {canManageUnits && (
                                        <HabitaIconActionButton
                                            icon={<Pencil />}
                                            variant="ghost"
                                            size="sm"
                                            tooltip="Configurar Ocupação / Inquilino"
                                            onClick={() => { setShowResidentsModal(false); startEditing(selectedUnit); }}
                                        />
                                    )}
                                </div>
                            );
                        })()}

                        {/* Billing Card Section */}
                        {(() => {
                            const resp = getResponsavelDaUnidade(selectedUnit.id);
                            const isInquilino = resp.tipo === 'inquilino';
                            return isInquilino ? (
                                <div className="space-y-3">
                                    <div className="p-6 bg-amber-50/60 rounded-2xl border border-amber-200 border-dashed relative">
                                        <div className="absolute -top-3 left-6 flex items-center gap-2">
                                            <span className="px-3 py-1 bg-amber-500 text-white rounded-full font-black text-[8px] uppercase tracking-[0.2em] shadow-sm">Fatura em Nome de</span>
                                            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-black text-[8px] uppercase tracking-[0.15em] border border-amber-200">Inquilino</span>
                                        </div>
                                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{resp.inquilino?.name || resp.nome}</h3>
                                        {resp.inquilino?.email && <p className="text-[10px] text-amber-600 font-bold mt-1">{resp.inquilino.email}</p>}
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Responsável pelo pagamento das faturas do condomínio</p>
                                    </div>
                                    {resp.proprietario && (
                                        <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-100 border-dashed relative flex items-center justify-between gap-4">
                                            <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-indigo-600 text-white rounded-full font-black text-[7px] uppercase tracking-[0.2em] shadow-sm">Proprietário da Unidade</div>
                                            <div>
                                                <h4 className="text-sm font-black text-slate-700 uppercase tracking-tight">{resp.proprietario.name || resp.proprietario.email}</h4>
                                            </div>
                                            <HabitaBadge variant="indigo" size="xs" className="shrink-0 bg-indigo-600 text-white border-transparent text-[8px] font-black tracking-widest">PROPRIETÁRIO</HabitaBadge>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 border-dashed relative">
                                    <div className="absolute -top-3 left-6 px-3 py-1 bg-indigo-600 text-white rounded-full font-black text-[8px] uppercase tracking-[0.2em] shadow-sm">Titular Responsável</div>
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{resp.nome}</h3>
                                    {resp.email && <p className="text-[10px] text-indigo-500 font-bold mt-1">{resp.email}</p>}
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Ponto de contato principal e responsável legal pelas faturas</p>
                                </div>
                            );
                        })()}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                            {/* Left Column: Residents */}
                            <div className="space-y-8">
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Users size={14} className="text-blue-500" /> Moradores Cadastrados
                                    </h4>
                                    
                                        <HabitaTable 
                                            responsive
                                            mobileVariant="list"
                                            isEmpty={(getActiveUsersForUnit(selectedUnit.id).length === 0) && (!selectedUnit.dependentes || selectedUnit.dependentes.length === 0)}
                                            emptyMessage="Nenhum morador cadastrado"
                                            containerClassName="border border-slate-100 rounded-xl overflow-hidden shadow-sm"
                                        >
                                            <HabitaTHead>
                                                <HabitaTR>
                                                    <HabitaTH>Morador</HabitaTH>
                                                    <HabitaTH>Vínculo</HabitaTH>
                                                    <HabitaTH className="w-10 text-right">Ações</HabitaTH>
                                                </HabitaTR>
                                            </HabitaTHead>
                                            <HabitaTBody>
                                                {/* App Access Users */}
                                                {getActiveUsersForUnit(selectedUnit.id).map(user => (
                                                    <HabitaTR key={user.uid}>
                                                        {/* Mobile */}
                                                        <HabitaTD responsive={false} className="md:hidden block w-full py-2 border-b border-slate-50 last:border-none">
                                                            <div className="flex items-center justify-between w-full">
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                                                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{user.name || user.email.split('@')[0]}</span>
                                                                    </div>
                                                                    <HabitaBadge variant="success" size="xs" className="w-fit">ACESSO APP</HabitaBadge>
                                                                </div>
                                                            </div>
                                                        </HabitaTD>
                                                        
                                                        {/* Desktop */}
                                                        <HabitaTD label="Morador" className="hidden md:table-cell py-2.5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{user.name || user.email.split('@')[0]}</span>
                                                            </div>
                                                        </HabitaTD>
                                                        <HabitaTD label="Vínculo" className="hidden md:table-cell py-2.5">
                                                            <HabitaBadge variant="success" size="xs">ACESSO APP</HabitaBadge>
                                                        </HabitaTD>
                                                        <HabitaTD label="Ações" className="hidden md:table-cell py-2.5 text-right">
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sincronizado</span>
                                                        </HabitaTD>
                                                    </HabitaTR>
                                                ))}

                                                {/* Registered Dependents */}
                                                {selectedUnit.dependentes?.map((dep, idx) => (
                                                    <HabitaTR key={`dep-${idx}`}>
                                                        {/* Mobile */}
                                                        <HabitaTD responsive={false} className="md:hidden block w-full py-2 border-b border-slate-50 last:border-none">
                                                            <div className="flex items-center justify-between w-full">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{dep.nome}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <HabitaBadge variant="neutral" size="xs" className="text-[8px] uppercase tracking-tighter">
                                                                            {dep.tipo}
                                                                        </HabitaBadge>
                                                                        {dep.observacoes && <span className="text-[9px] text-slate-400 italic truncate max-w-[120px]">{dep.observacoes}</span>}
                                                                    </div>
                                                                </div>
                                                                <HabitaIconActionButton icon={<Trash2 />} variant="danger" size="md" tooltip="Remover Morador" onClick={() => handleRemoveDependent(idx)} className="ml-auto" />
                                                            </div>
                                                        </HabitaTD>

                                                        {/* Desktop */}
                                                        <HabitaTD label="Morador" className="hidden md:table-cell py-2.5">
                                                            <div className="flex flex-col">
                                                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{dep.nome}</span>
                                                                {dep.observacoes && <span className="text-[9px] text-slate-400 italic truncate">{dep.observacoes}</span>}
                                                            </div>
                                                        </HabitaTD>
                                                        <HabitaTD label="Vínculo" className="hidden md:table-cell py-2.5">
                                                            <HabitaBadge variant="neutral" size="xs" className="text-[8px] uppercase tracking-tighter">
                                                                {dep.tipo}
                                                            </HabitaBadge>
                                                        </HabitaTD>
                                                        <HabitaTD label="Ações" className="hidden md:table-cell py-2.5 text-right">
                                                            <HabitaIconActionButton icon={<Trash2 />} variant="danger" size="sm" tooltip="Remover Morador" onClick={() => handleRemoveDependent(idx)} />
                                                        </HabitaTD>
                                                    </HabitaTR>
                                                ))}
                                            </HabitaTBody>
                                        </HabitaTable>
                                </div>

                                {/* Add Resident Form */}
                                <div className="p-6 bg-blue-50/20 rounded-2xl border border-blue-100 space-y-5">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adicionar Integrante</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <HabitaInput label="Nome" value={depName} onChange={e => setDepName(e.target.value)} placeholder="Ex: Maria" />
                                        <HabitaCombobox 
                                            label="Vínculo"
                                            value={depType} 
                                            onChange={(val: any) => setDepType(val)}
                                            options={[
                                                { label: 'Filho(a)', value: 'Filho(a)' },
                                                { label: 'Cônjuge', value: 'Cônjuge' },
                                                { label: 'Parente', value: 'Parente' },
                                                { label: 'Inquilino', value: 'Inquilino' },
                                                { label: 'Outro', value: 'Outro' }
                                            ]}
                                        />
                                    </div>
                                    <HabitaInput label="Observações" value={depObs} onChange={e => setDepObs(e.target.value)} placeholder="Ex: Alérgico a amendoim" />
                                    <HabitaButton onClick={handleAddDependent} variant="primary" className="w-full bg-blue-600 border-blue-600" icon={<UserPlus size={18} />}>
                                        Confirmar Inclusão
                                    </HabitaButton>
                                </div>

                                <div className="p-6 bg-emerald-50/20 rounded-2xl border border-emerald-100 space-y-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                            <Shield size={16} />
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Vincular Conta de Morador</h4>
                                            <p className="text-[9px] text-slate-500 font-medium">Permitir acesso ao App para um inquilino ou familiar</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <HabitaInput 
                                            label="Email da Conta" 
                                            placeholder="exemplo@habitat.com" 
                                            value={assocEmail}
                                            onChange={e => setAssocEmail(e.target.value)}
                                        />
                                        
                                        <HabitaSelect 
                                            label="Perfil de Acesso (Amarração)"
                                            value={assocProfileId}
                                            onChange={e => setAssocProfileId(e.target.value)}
                                        >
                                            {allProfiles.length > 0 ? (
                                                [...allProfiles]
                                                    .sort((a, b) => {
                                                        const isA_Seeded = a.id.startsWith('perfil_');
                                                        const isB_Seeded = b.id.startsWith('perfil_');
                                                        if (isA_Seeded && !isB_Seeded) return -1;
                                                        if (!isA_Seeded && isB_Seeded) return 1;
                                                        return a.name.localeCompare(b.name);
                                                    })
                                                    .map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))
                                            ) : (
                                                <option disabled>Nenhum perfil disponível</option>
                                            )}
                                        </HabitaSelect>

                                        <HabitaButton 
                                            onClick={handleAssociateUser} 
                                            variant="primary" 
                                            className="w-full bg-emerald-600 border-emerald-600" 
                                            icon={<Shield size={18} />}
                                            isLoading={isAssocProcessing}
                                        >
                                            Vincular e Garantir Acesso
                                        </HabitaButton>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Vehicles */}
                            <div className="space-y-8">
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Car size={14} className="text-indigo-500" /> Veículos Registrados
                                    </h4>
                                    
                                    <HabitaTable 
                                        responsive
                                        mobileVariant="list"
                                        isEmpty={!selectedUnit.vehicles || selectedUnit.vehicles.length === 0}
                                        emptyMessage="Nenhum veículo"
                                        containerClassName="border border-slate-100 rounded-xl overflow-hidden shadow-sm"
                                    >
                                        <HabitaTHead>
                                            <HabitaTR>
                                                <HabitaTH>Veículo</HabitaTH>
                                                <HabitaTH>Placa</HabitaTH>
                                                <HabitaTH className="hidden md:table-cell">Vaga</HabitaTH>
                                                <HabitaTH className="w-10 text-right">Ações</HabitaTH>
                                            </HabitaTR>
                                        </HabitaTHead>
                                        <HabitaTBody>
                                            {selectedUnit.vehicles?.map((veh, idx) => (
                                                <HabitaTR key={idx}>
                                                    {/* Mobile */}
                                                    <HabitaTD responsive={false} className="md:hidden block w-full py-2 border-b border-slate-50 last:border-none">
                                                        <div className="flex items-center justify-between w-full">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{veh.model}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <HabitaBadge variant="neutral" size="xs" className="font-mono">{veh.plate}</HabitaBadge>
                                                                    <span className="text-[9px] text-slate-400 uppercase font-medium">{veh.color} {veh.parkingSpace ? `• Vaga ${veh.parkingSpace}` : ''}</span>
                                                                </div>
                                                            </div>
                                                            <HabitaIconActionButton icon={<Trash2 />} variant="danger" size="md" tooltip="Remover Veículo" onClick={() => handleRemoveVehicle(idx)} className="ml-auto" />
                                                        </div>
                                                    </HabitaTD>

                                                    {/* Desktop */}
                                                    <HabitaTD label="Veículo" className="hidden md:table-cell py-2.5">
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{veh.model}</span>
                                                            <span className="text-[9px] text-slate-400 uppercase font-medium">{veh.color}</span>
                                                        </div>
                                                    </HabitaTD>
                                                    <HabitaTD label="Placa" className="hidden md:table-cell py-2.5">
                                                        <HabitaBadge variant="neutral" size="xs" className="font-mono">{veh.plate}</HabitaBadge>
                                                    </HabitaTD>
                                                    <HabitaTD label="Vaga" className="hidden md:table-cell py-2.5">
                                                        <span className="text-[11px] font-bold text-slate-500">{veh.parkingSpace || '-'}</span>
                                                    </HabitaTD>
                                                    <HabitaTD label="Ações" className="hidden md:table-cell py-2.5 text-right">
                                                        <HabitaIconActionButton icon={<Trash2 />} variant="danger" size="sm" tooltip="Remover Veículo" onClick={() => handleRemoveVehicle(idx)} />
                                                    </HabitaTD>
                                                </HabitaTR>
                                            ))}
                                        </HabitaTBody>
                                    </HabitaTable>
                                </div>

                                {/* Add Vehicle Form */}
                                <div className="p-6 bg-indigo-50/20 rounded-2xl border border-indigo-100 space-y-5">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Novo Veículo</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <HabitaInput label="Placa" value={vehPlate} onChange={e => setVehPlate(e.target.value.toUpperCase())} placeholder="ABC-1234" className="font-black" />
                                        <HabitaInput label="Modelo" value={vehModel} onChange={e => setVehModel(e.target.value)} placeholder="Ex: Civic" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <HabitaInput label="Cor" value={vehColor} onChange={e => setVehColor(e.target.value)} placeholder="Prata" />
                                        <HabitaInput label="Vaga" value={vehParkingSpace} onChange={e => setVehParkingSpace(e.target.value)} placeholder="01" />
                                    </div>
                                    <HabitaButton onClick={handleAddVehicle} variant="primary" className="w-full bg-indigo-600 border-indigo-600" icon={<Car size={18} />}>
                                        Cadastrar Veículo
                                    </HabitaButton>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </HabitaModal>

            {/* Modal: Editar Unidade (Seção 4.2 da Skill) */}
            <HabitaModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title={`Configuração da Unidade ${editingUnit?.id}`}
                size="md"
                footer={
                    <div className="flex gap-3 w-full sm:w-auto">
                        <HabitaButton variant="outline" onClick={() => setIsEditModalOpen(false)} className="flex-1">Cancelar</HabitaButton>
                        <HabitaButton onClick={handleSaveEdit} variant="primary" className="flex-1">Salvar Alterações</HabitaButton>
                    </div>
                }
            >
                {editingUnit && (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative group">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Email do Proprietário (Conta de Sistema)</label>
                                <div className="relative">
                                    <HabitaInput 
                                        value={editOwnerEmail} 
                                        onChange={e => {
                                            const val = e.target.value;
                                            setEditOwnerEmail(val);
                                            // Busca automática na lista de usuários do sistema para o proprietário
                                            const user = allSystemUsers.find(u => u.email.toLowerCase() === val.toLowerCase());
                                            if (user) {
                                                setEditOwnerId(user.uid);
                                                setEditOwnerName(user.name || '');
                                                showToast(`Proprietário identificado: ${user.name}`, 'info');
                                            } else {
                                                setEditOwnerId(undefined);
                                            }
                                        }} 
                                        placeholder="proprietario@email.com"
                                        className="h-11 font-medium text-slate-700 bg-white"
                                        disabled={!!editOwnerId}
                                    />
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={16} />
                                </div>
                                {!!editOwnerId && (
                                    <p className="text-[9px] text-emerald-600 font-bold mt-1 uppercase tracking-tighter">
                                        ✅ Conta de sistema vinculada. Dados sincronizados.
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <HabitaInput 
                                    label="Nome do Proprietário" 
                                    value={editOwnerName} 
                                    onChange={e => setEditOwnerName(e.target.value)} 
                                    className="h-10 font-normal text-slate-700"
                                    disabled={!!editOwnerId || getActiveUsersForUnit(editingUnit.id).length > 0}
                                />
                                <HabitaCombobox 
                                    label="Tipologia de Unidade" 
                                    options={settings.unitTypes.map(t => ({ label: t.name.toUpperCase(), value: t.id }))}
                                    value={editTypeId}
                                    onChange={setEditTypeId}
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Modo de Ocupação da Unidade</label>
                                <HabitaBadge variant={residentType === 'tenant' ? 'neutral' : 'indigo'} size="xs" className="h-5 px-2">
                                    {residentType === 'tenant' ? 'CONTRATO DE LOCAÇÃO' : 'RESIDÊNCIA DO PROPRIETÁRIO'}
                                </HabitaBadge>
                            </div>
                            
                            <div className="flex gap-4 p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                                <button
                                    onClick={() => setResidentType('owner')}
                                    className={cn(
                                        "flex-1 py-2.5 px-4 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                                        residentType === 'owner' 
                                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                                            : "bg-transparent text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    PROPRIETÁRIO
                                </button>
                                <button
                                    onClick={() => setResidentType('tenant')}
                                    className={cn(
                                        "flex-1 py-2.5 px-4 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                                        residentType === 'tenant' 
                                            ? "bg-slate-800 text-white shadow-md shadow-slate-100" 
                                            : "bg-transparent text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    INQUILINO
                                </button>
                            </div>

                            {residentType === 'tenant' && (
                                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                    {/* Tenant Search/Input */}
                                    <div className="relative group">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Vincular Conta de Inquilino (Email)</label>
                                        <div className="relative">
                                            <HabitaInput 
                                                value={tenantEmail} 
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setTenantEmail(val);
                                                    // Buscap automática na lista de usuários do sistema
                                                    const user = allSystemUsers.find(u => u.email.toLowerCase() === val.toLowerCase());
                                                    if (user) {
                                                        setEditTenantId(user.uid);
                                                        setTenantName(user.name || '');
                                                        showToast(`Inquilino identificado: ${user.name}`, 'info');
                                                    } else {
                                                        setEditTenantId(undefined);
                                                    }
                                                }} 
                                                placeholder="inquilino@email.com"
                                                className="h-11 font-medium text-slate-700 bg-white"
                                                disabled={!!editTenantId}
                                            />
                                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={16} />
                                        </div>
                                        {!!editTenantId && (
                                            <p className="text-[9px] text-blue-600 font-bold mt-1 uppercase tracking-tighter">
                                                ✅ Conta de sistema vinculada. Dados sincronizados.
                                            </p>
                                        )}
                                    </div>

                                    {!editTenantId && tenantEmail && (
                                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[10px] font-bold text-amber-700 flex items-start gap-2">
                                            <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                                            <span>O email informado não possui conta ativa no sistema. Cadastre os dados manuais abaixo para fins de controle e notificações externas.</span>
                                        </div>
                                    )}

                                    <HabitaInput 
                                        label="Nome do Inquilino (Exibição)" 
                                        value={tenantName} 
                                        onChange={e => setTenantName(e.target.value)} 
                                        placeholder="Nome completo do morador"
                                        className="h-10 font-normal text-slate-700"
                                        disabled={!!editTenantId || getActiveUsersForUnit(editingUnit.id).length > 0}
                                    />
                                    
                                    <div className="p-3 bg-white border border-slate-100 rounded-xl">
                                        <HabitaInput 
                                            label="Contato Crítico do Proprietário" 
                                            value={ownerContact} 
                                            onChange={e => setOwnerContact(e.target.value)} 
                                            placeholder="(00) 00000-0000"
                                            className="h-10 font-normal text-slate-700"
                                            disabled={getActiveUsersForUnit(editingUnit.id).length > 0}
                                        />
                                        <p className="text-[9px] text-slate-400 mt-2 italic">* Este contato será usado apenas para cobranças e avisos proprietários.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </HabitaModal>

            {/* Import Modal */}
            <ImportUnitsModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={async (data) => {
                    try {
                        const res = await api.post('/units/bulk', { units: data });
                        showToast(`${res.data?.count || 0} unidades importadas com sucesso!`, 'success');
                        setIsImportModalOpen(false);
                        await loadData();
                    } catch (error: any) {
                        const errorMsg = error.response?.data?.error || 'Erro na importação';
                        showToast(errorMsg, 'error');
                        throw new Error(errorMsg);
                    }
                }}
                unitTypes={settings.unitTypes || []}
            />

            {/* Delete Modal */}
            <HabitaModal
                isOpen={!!unitToDelete}
                onClose={() => setUnitToDelete(null)}
                title="Confirmar Exclusão"
                size="sm"
                footer={
                    <div className="flex gap-3 w-full sm:w-auto">
                        <HabitaButton variant="outline" onClick={() => setUnitToDelete(null)} className="flex-1">
                            Manter Unidade
                        </HabitaButton>
                        <HabitaButton 
                            variant="danger" 
                            onClick={async () => {
                                if (unitToDelete) {
                                    try {
                                        await api.delete(`/units/${unitToDelete.id}`);
                                        setUnitToDelete(null);
                                        showToast('Unidade excluída!', 'success');
                                        loadData();
                                    } catch (error) {
                                        showToast('Erro ao excluir unidade.', 'error');
                                    }
                                }
                            }} 
                            className="flex-1"
                        >
                            Confirmar
                        </HabitaButton>
                    </div>
                }
            >
                <div className="text-center space-y-6 py-4">
                    <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100 shadow-sm">
                        <Trash2 size={32} />
                    </div>
                    <div className="space-y-3">
                        <p className="text-slate-600 font-bold text-sm leading-relaxed px-4">
                            Deseja realmente remover a unidade <strong>{unitToDelete?.id}</strong> pertencente a {unitToDelete?.ownerName}?
                        </p>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-[9px] text-slate-400 leading-relaxed font-black uppercase tracking-widest text-left flex gap-2 shadow-inner">
                            <Shield className="text-rose-500 shrink-0" size={12} />
                            <p>Esta ação removerá permanentemente todos os moradores e veículos vinculados a esta unidade no sistema.</p>
                        </div>
                    </div>
                </div>
            </HabitaModal>
        </div>
    );
};

export default UnitsPage;
