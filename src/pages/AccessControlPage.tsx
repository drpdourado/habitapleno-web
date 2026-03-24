import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

import { 
    Shield, 
    Search, 
    X, 
    User, 
    Box, 
    Truck, 
    Package as PackageIcon, 
    History as HistoryIcon, 
    Download, 
    SearchCheck, 
    CheckCircle2, 
    Users, 
    Trash2, 
    Car,
    Plus,
    LogOut,
    ShieldAlert,
    PackageOpen
} from 'lucide-react';
import { QuickSearchModal } from '../components/QuickSearchModal';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission } from '../utils/rbac';
import { useToast } from '../contexts/ToastContext';

import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { HabitaTabs } from '../components/ui/HabitaTabs';
import { HabitaMobileTabs } from '../components/ui/HabitaMobileTabs';
import { HabitaStatGrid } from '../components/ui/HabitaStatGrid';
import { HabitaStatGrid3x1 } from '../components/ui/HabitaStatGrid3x1';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaInput, HabitaTextarea } from '../components/ui/HabitaForm';
import { HabitaCombobox } from '../components/ui/HabitaCombobox';
import { HabitaDatePicker } from '../components/ui/HabitaDatePicker';
import { 
    HabitaTable, 
    HabitaTHead, 
    HabitaTBody, 
    HabitaTR, 
    HabitaTH, 
    HabitaTD 
} from '../components/ui/HabitaTable';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { HabitaIconActionButton } from '../components/ui/HabitaIconActionButton';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function AccessControlPage() {
    // Context fallbacks for cleaning
    const {
        accessControl,
        units,
        visiblePackages,
        reloadCondoData
    } = useApp();
    const { accessProfile, isAdmin, profile } = useAuth();
    const { showToast } = useToast();


    const [searchParams, setSearchParams] = useSearchParams();

    const canManageAllAccess = hasPermission(accessProfile, 'access', 'all') || isAdmin;
    const canRegisterAccess = hasPermission(accessProfile, 'access', 'own') || canManageAllAccess;
    const canManagePackages = hasPermission(accessProfile, 'packages', 'all') || isAdmin;
    const canSeePackages = hasPermission(accessProfile, 'packages', 'own') || canManagePackages;

    const activeTab = searchParams.get('tab') === 'packages' ? 'packages' : 'access';

    // Load users for family composition


    const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isDeletingPackage, setIsDeletingPackage] = useState<string | null>(null);

    // Sidebar selected states
    const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
    const [selectedAccessId, setSelectedAccessId] = useState<string | null>(null);

    // Global Quick Search
    const [showQuickSearch, setShowQuickSearch] = useState(false);

    // Modals
    const [showAccessModal, setShowAccessModal] = useState(false);
    const [showPackageModal, setShowPackageModal] = useState(false);
    const [showMobileDetails, setShowMobileDetails] = useState(false);

    // Form state: Access
    const [visitorName, setVisitorName] = useState('');
    const [visitorDoc, setVisitorDoc] = useState('');
    const [type, setType] = useState<'visitante' | 'prestador'>('visitante');
    const [targetUnitId, setTargetUnitId] = useState('');
    const [plate, setPlate] = useState('');
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehicleColor, setVehicleColor] = useState('');
    const [company, setCompany] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    // Form state: Package
    const [packageType, setPackageType] = useState<'pacote' | 'envelope' | 'delivery'>('pacote');
    const [pUnitId, setPUnitId] = useState('');
    const [packageObservation, setPackageObservation] = useState('');

    // Pre-fill unit for residents (who cannot change their unit in the combo)
    useEffect(() => {
        if (!canManageAllAccess && profile?.unitId && targetUnitId !== profile.unitId) {
            setTargetUnitId(profile.unitId);
        }
    }, [profile, canManageAllAccess, targetUnitId]);

    // Filterered Access Logic
    const filteredAccess = useMemo(() => {
        let list = [...accessControl];

        if (!canManageAllAccess && profile?.unitId) {
            list = list.filter((a: any) =>
                a.createdBy === profile.uid ||
                (a.targetUnitId && String(a.targetUnitId).trim() === String(profile.unitId).trim())
            );
        }

        const now = new Date().toISOString().split('T')[0];
        if (viewMode === 'active') {
            list = list.filter((a: any) => a.status === 'dentro' || (a.startDate <= now && a.endDate >= now && a.status === 'pendente'));
        } else {
            list = list.filter((a: any) => a.status === 'concluido' || a.endDate < now);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            list = list.filter((a: any) => {
                const visitorMatch = a.visitorName.toLowerCase().includes(term);
                const plateMatch = (a.plate && a.plate.toLowerCase().includes(term));
                const unitMatch = (a.targetUnitId && a.targetUnitId.toLowerCase().includes(term));

                // Persistent vehicles search
                const unitVehicles = a.targetUnitId ? units.find((u: any) => u.id === a.targetUnitId)?.vehicles : [];
                const unitPlateMatch = unitVehicles?.some((v: any) => v.plate.toLowerCase().includes(term));

                return visitorMatch || plateMatch || unitMatch || unitPlateMatch;
            });
        }

        return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }, [accessControl, viewMode, searchTerm, canManageAllAccess, profile, units]);

    const filteredPackages = useMemo(() => {
        let list = [...(visiblePackages || [])];

        if (viewMode === 'active') {
            list = list.filter((p: any) => p.status === 'aguardando');
        } else {
            list = list.filter((p: any) => p.status === 'entregue');
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase().trim();
            list = list.filter((p: any) =>
                (p.unitId && String(p.unitId).toLowerCase().includes(term)) ||
                (p.observation && p.observation.toLowerCase().includes(term))
            );
        }

        return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }, [visiblePackages, viewMode, searchTerm]);

    const selectedPackage = useMemo(() =>
        visiblePackages.find((p: any) => p.id === selectedPackageId),
        [visiblePackages, selectedPackageId]);

    const selectedAccess = useMemo(() =>
        accessControl.find((a: any) => a.id === selectedAccessId),
        [accessControl, selectedAccessId]);

    // KPI Data
    const kpis = useMemo(() => {
        const activeVisitors = accessControl.filter((a: any) => a.status === 'dentro').length;
        const pendingPackages = (visiblePackages || []).filter((p: any) => p.status === 'aguardando').length;

        const today = new Date().toISOString().split('T')[0];
        const deliveredToday = (visiblePackages || []).filter((p: any) =>
            p.status === 'entregue' && p.pickupDate?.startsWith(today)
        ).length;

        return { activeVisitors, pendingPackages, deliveredToday };
    }, [accessControl, visiblePackages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/access-control', {
                visitorName,
                document: visitorDoc,
                type,
                targetUnitId: targetUnitId.trim(),
                plate,
                vehicleModel,
                vehicleColor,
                company: type === 'prestador' ? company : '',
                startDate,
                endDate
            });

            showToast('Acesso cadastrado com sucesso!', 'success');
            await reloadCondoData();

            // Reset form
            setVisitorName('');
            setVisitorDoc('');
            setTargetUnitId(!isAdmin && profile?.unitId ? profile.unitId : '');
            setPlate('');
            setVehicleModel('');
            setVehicleColor('');
            setCompany('');
            setShowAccessModal(false);
            setSearchParams({ tab: 'access' });
            setViewMode('active');
        } catch (error) {
            showToast('Erro ao cadastrar acesso.', 'error');
        }
    };

    const handleAction = async (id: string, action: 'entry' | 'exit') => {
        try {
            if (action === 'entry') {
                await api.put(`/access-control/${id}/entry`);
                showToast('Entrada registrada!', 'success');
            } else {
                await api.put(`/access-control/${id}/exit`);
                showToast('Saída registrada!', 'success');
                if (selectedAccessId === id) setSelectedAccessId(null);
            }
            await reloadCondoData();
        } catch (error) {
            showToast('Erro ao atualizar status.', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/access-control/${id}`);
            showToast('Registro removido.', 'success');
            setIsDeleting(null);
            if (selectedAccessId === id) setSelectedAccessId(null);
            await reloadCondoData();
        } catch (error) {
            showToast('Erro ao excluir.', 'error');
        }
    };

    const handlePackageSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pUnitId) {
            showToast('Selecione a unidade de destino.', 'warning');
            return;
        }

        try {
            await api.post('/packages', {
                unitId: pUnitId.trim(),
                type: packageType,
                observation: packageObservation
            });
            showToast('Encomenda registrada!', 'success');
            await reloadCondoData();

            setPUnitId('');
            setPackageObservation('');
            setPackageType('pacote');
            setShowPackageModal(false);
            setSearchParams({ tab: 'packages' });
            setViewMode('active');
        } catch (error) {
            showToast('Erro ao registrar encomenda.', 'error');
        }
    };

    const markAsDelivered = async (pkg: any) => {
        try {
            await api.put(`/packages/${pkg.id}`, {
                status: 'entregue',
                pickupDate: new Date().toISOString()
            });
            showToast('Encomenda marcada como entregue.', 'success');
            await reloadCondoData();
        } catch (error) {
            showToast('Erro ao atualizar status.', 'error');
        }
    };

    const handleDeletePackage = async (id: string) => {
        try {
            await api.delete(`/packages/${id}`);
            showToast('Encomenda excluída.', 'success');
            setIsDeletingPackage(null);
            if (selectedPackageId === id) setSelectedPackageId(null);
            await reloadCondoData();
        } catch (error) {
            showToast('Erro ao excluir.', 'error');
        }
    };

    const exportHistory = () => {
        const headers = ['Nome', 'Documento', 'Tipo', 'Unidade', 'Placa', 'Entrada', 'Saída'];
        const rows = filteredAccess.map((a: any) => [
            a.visitorName,
            a.document || 'N/A',
            a.type === 'visitante' ? 'Visitante' : 'Prestador',
            a.targetUnitId || 'ADM',
            a.plate || '-',
            a.checkInTime ? new Date(a.checkInTime).toLocaleString() : '-',
            a.checkOutTime ? new Date(a.checkOutTime).toLocaleString() : '-'
        ]);

        const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = window.document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `historico_portaria_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setShowQuickSearch(true);
            }
            if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
                e.preventDefault();
                setShowQuickSearch(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const renderDetailContent = () => {
        if (activeTab === 'packages') {
            if (!selectedPackage) {
                return (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40 py-12">
                        <PackageIcon size={48} className="text-slate-200" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-8">Selecione uma encomenda para ver detalhes</p>
                    </div>
                );
            }
            return (
                <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8">
                    {/* Package Details Content */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-emerald-600">
                                <Box size={32} />
                            </div>
                            <div>
                                <HabitaBadge variant="success" size="xs">ENCOMENDA #{selectedPackage.id.slice(-4)}</HabitaBadge>
                                <h4 className="text-xl font-black text-slate-800 mt-1 uppercase">Unidade {selectedPackage.unitId}</h4>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white rounded-xl border border-slate-100">
                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Chegada</span>
                                <span className="text-xs font-bold text-slate-700">{new Date(selectedPackage.arrivalDate).toLocaleDateString()}</span>
                            </div>
                            <div className="p-3 bg-white rounded-xl border border-slate-100">
                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Hora</span>
                                <span className="text-xs font-bold text-slate-700">{new Date(selectedPackage.arrivalDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Observações da Portaria</span>
                            <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl text-xs font-medium text-slate-600 leading-relaxed italic">
                                "{selectedPackage.observation || 'Sem observações.'}"
                            </div>
                        </div>
                    </div>

                    {/* Unit Composition Section */}
                    {(() => {
                        const unit = units.find((u: any) => u.id === selectedPackage.unitId);
                        if (!unit) return null;
                        return (
                            <div className="space-y-4 pt-8 border-t border-slate-100">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Users size={14} className="text-blue-500" /> Moradores
                                </h4>
                                <div className="space-y-2">
                                    <div className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between">
                                        <span className="text-xs font-black text-slate-700 uppercase">{unit.ownerName}</span>
                                        <HabitaBadge variant="indigo" size="xs">TITULAR</HabitaBadge>
                                    </div>
                                    {unit.dependentes?.map((dep: any, i: number) => (
                                        <div key={i} className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-600 capitalize">{dep.nome}</span>
                                            <HabitaBadge variant="neutral" size="xs">{dep.tipo.toUpperCase()}</HabitaBadge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            );
        } else {
            if (!selectedAccess) {
                return (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40 py-12">
                        <User size={48} className="text-slate-200" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-8">Selecione um acesso para ver detalhes</p>
                    </div>
                );
            }
            return (
                <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8">
                    {/* Access Details Content */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-indigo-600">
                                <User size={32} />
                            </div>
                            <div>
                                <HabitaBadge variant={selectedAccess.type === 'visitante' ? 'indigo' : 'neutral'} size="xs">{selectedAccess.type.toUpperCase()}</HabitaBadge>
                                <h4 className="text-xl font-black text-slate-800 mt-1 uppercase">{selectedAccess.visitorName}</h4>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Unidade</span>
                                <span className="text-xs font-black text-slate-700">UNIDADE {selectedAccess.targetUnitId || 'ADM'}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Documento</span>
                                <span className="text-xs font-bold text-slate-600">{selectedAccess.document || 'NÃO INF.'}</span>
                            </div>
                        </div>

                        {selectedAccess.plate && (
                            <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100 space-y-2">
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5"><Car size={10}/> Veículo Identificado</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-black text-indigo-700 tracking-tight">{selectedAccess.plate}</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{selectedAccess.vehicleModel}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Access Timeline */}
                    <div className="space-y-4 pt-8 border-t border-slate-100">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <HistoryIcon size={14} className="text-blue-500" /> Linha do Tempo
                        </h4>
                        <div className="relative pl-6 space-y-6 border-l-2 border-slate-100 ml-1.5">
                            <div className="relative">
                                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-blue-50 border-4 border-white shadow-sm" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Autorização Gerada</span>
                                <span className="text-xs font-bold text-slate-700">{new Date(selectedAccess.createdAt).toLocaleString()}</span>
                            </div>
                            {selectedAccess.checkInTime && (
                                <div className="relative">
                                    <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-100 border-4 border-white shadow-sm" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Entrada Registrada</span>
                                    <span className="text-xs font-bold text-slate-700">{new Date(selectedAccess.checkInTime).toLocaleString()}</span>
                                </div>
                            )}
                                    {selectedAccess.checkOutTime && (
                                        <div className="relative">
                                            <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-rose-100 border-4 border-white shadow-sm" />
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Saída Registrada</span>
                                            <span className="text-xs font-bold text-slate-700">{new Date(selectedAccess.checkOutTime).toLocaleString()}</span>
                                        </div>
                                    )}
                        </div>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="w-full animate-in fade-in duration-700 pb-12">
            <HabitaContainer>
                <HabitaContainerHeader 
                    title="Portaria & Acessos"
                    subtitle="Gestão de Fluxo, Visitantes e Encomendas"
                    icon={<Shield size={24} />}
                    actions={
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                            <div className="flex items-center gap-3">
                                <HabitaButton
                                    variant="outline"
                                    onClick={() => setViewMode(viewMode === 'active' ? 'history' : 'active')}
                                    icon={<HistoryIcon size={16} />}
                                    className="flex-1 md:flex-none"
                                >
                                    {viewMode === 'active' ? 'Ver Histórico' : 'Ver Ativos'}
                                </HabitaButton>

                                {viewMode === 'history' && (
                                    <HabitaButton
                                        variant="outline"
                                        onClick={exportHistory}
                                        icon={<Download size={16} />}
                                    >
                                        Exportar
                                    </HabitaButton>
                                )}
                            </div>

                            <div className="h-8 w-px bg-slate-200 mx-2 hidden xl:block" />

                            <div className="grid grid-cols-2 md:flex md:items-center gap-3">
                                {canRegisterAccess && (
                                    <HabitaButton
                                        variant="primary"
                                        onClick={() => {
                                            setSearchParams({ tab: 'access' });
                                            setShowAccessModal(true);
                                        }}
                                        icon={<Plus size={18} />}
                                        className="w-full md:w-auto"
                                    >
                                        Novo Acesso
                                    </HabitaButton>
                                )}

                                {canManagePackages && (
                                    <HabitaButton
                                        onClick={() => {
                                            setSearchParams({ tab: 'packages' });
                                            setShowPackageModal(true);
                                        }}
                                        variant="secondary"
                                        icon={<PackageIcon size={18} />}
                                        className="w-full md:w-auto"
                                    >
                                        Encomenda
                                    </HabitaButton>
                                )}
                            </div>
                        </div>
                    }
                />

                <div className="bg-white border-b border-slate-100 px-5 md:px-8">
                    <HabitaTabs 
                        tabs={[
                            { id: 'access', label: 'Controle de Acessos', icon: <SearchCheck size={16} /> },
                            ...(canSeePackages ? [{ id: 'packages', label: 'Encomendas / Desk', icon: <PackageIcon size={16} /> }] : [])
                        ]}
                        activeTab={activeTab}
                        onChange={(id) => setSearchParams({ tab: id })}
                        className="border-none p-0 h-16 hidden md:flex"
                    />

                    <HabitaMobileTabs
                        tabs={[
                            { id: 'access', label: 'Acessos', icon: <SearchCheck size={16} /> },
                            ...(canSeePackages ? [{ id: 'packages', label: 'Encomendas', icon: <PackageIcon size={16} /> }] : [])
                        ]}
                        activeTab={activeTab}
                        onChange={(id) => setSearchParams({ tab: id })}
                        className="md:hidden pb-4"
                        label="Área de Operações"
                    />
                </div>

                <HabitaContainerContent padding="none">
                    {/* KPI Section - Unified Grid */}
                    <div className="px-4 md:px-8 py-0">
                        {/* Versão Desktop */}
                        <div className="hidden lg:block">
                            <HabitaStatGrid 
                                title="Monitoramento de Portaria"
                                icon={<Shield className="text-indigo-500" />}
                                metrics={[
                                    {
                                        label: "VISITANTES ATIVOS",
                                        value: kpis.activeVisitors,
                                        icon: <User />,
                                        variant: "indigo",
                                        subtext: "Circulando Agora"
                                    },
                                    {
                                        label: "ENCOMENDAS PENDENTES",
                                        value: kpis.pendingPackages,
                                        icon: <Box />,
                                        variant: "amber",
                                        subtext: "Aguardando Retirada"
                                    },
                                    {
                                        label: "ENTREGAS HOJE",
                                        value: kpis.deliveredToday,
                                        icon: <Truck />,
                                        variant: "emerald",
                                        subtext: "Fluxo Diário"
                                    }
                                ]}
                                cols={3}
                            />
                        </div>

                        {/* Versão Mobile */}
                        <div className="block lg:hidden">
                            <HabitaStatGrid3x1 
                                title="Resumo Operacional"
                                icon={<Shield className="text-indigo-500" />}
                                metrics={[
                                    {
                                        label: "VISITANTES",
                                        value: kpis.activeVisitors,
                                        icon: <User />,
                                        variant: "indigo",
                                        subtext: "Ativos"
                                    },
                                    {
                                        label: "ENCOMENDAS",
                                        value: kpis.pendingPackages,
                                        icon: <Box />,
                                        variant: "amber",
                                        subtext: "Aguardando"
                                    },
                                    {
                                        label: "ENTREGUES",
                                        value: kpis.deliveredToday,
                                        icon: <Truck />,
                                        variant: "emerald",
                                        subtext: "Hoje"
                                    }
                                ]}
                            />
                        </div>
                    </div>

                    {/* Main Content Layout Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
                        {/* Left Column (70%) */}
                        <div className="lg:col-span-12 xl:col-span-7 space-y-6">
                            {/* Filter Bar Inside Main Card */}
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 md:p-6 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
                                <div className="bg-white p-1 rounded-xl border border-slate-200 hidden md:inline-flex overflow-x-auto max-w-full">
                                    <HabitaTabs 
                                        tabs={[
                                            { id: 'access', label: 'Monitoramento de Acessos', icon: <Shield size={14} /> },
                                            { id: 'packages', label: 'Encomendas & Delivery', icon: <Box size={14} />, hidden: !canSeePackages }
                                        ].filter(t => !t.hidden)}
                                        activeTab={activeTab}
                                        onChange={(id) => setSearchParams({ tab: id })}
                                        className="border-none bg-transparent p-0"
                                    />
                                </div>

                                <HabitaMobileTabs
                                    tabs={[
                                        { id: 'access', label: 'Monitoramento de Acessos', icon: <Shield size={14} /> },
                                        { id: 'packages', label: 'Encomendas & Delivery', icon: <Box size={14} />, hidden: !canSeePackages }
                                    ].filter(t => !t.hidden)}
                                    activeTab={activeTab}
                                    onChange={(id) => setSearchParams({ tab: id })}
                                    className="md:hidden"
                                    label="Visualização"
                                />

                                <div className="relative flex-1 w-full lg:max-w-sm">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <HabitaInput
                                        placeholder="Unidade, nome ou documento..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-12 h-12 rounded-xl border-slate-200 focus:border-indigo-500 shadow-sm"
                                    />
                                    {searchTerm && (
                                        <button 
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                        {/* Data Table */}
                            <HabitaTable 
                                responsive 
                                mobileVariant="list"
                                containerClassName="border border-slate-200 rounded-xl overflow-hidden shadow-none"
                            >
                                <HabitaTHead>
                                    <HabitaTR>
                                        <HabitaTH className="w-20 text-center">Unidade</HabitaTH>
                                        <HabitaTH>{activeTab === 'packages' ? 'Destinatário' : 'Visitante / Nome'}</HabitaTH>
                                        <HabitaTH className="text-center">Tipo</HabitaTH>
                                        <HabitaTH className="text-center">{activeTab === 'packages' ? 'Chegada' : 'Status'}</HabitaTH>
                                        <HabitaTH className="text-right">Ação</HabitaTH>
                                    </HabitaTR>
                                </HabitaTHead>
                                <HabitaTBody>
                                    {activeTab === 'packages' ? (
                                        filteredPackages.length > 0 ? (
                                            filteredPackages.map((pkg: any) => (
                                                <HabitaTR 
                                                    key={pkg.id} 
                                                    onClick={() => {
                                                        setSelectedPackageId(pkg.id);
                                                        if (window.innerWidth < 768) setShowMobileDetails(true);
                                                    }}
                                                    className={cn("cursor-pointer", selectedPackageId === pkg.id && "bg-indigo-50/50")}
                                                >
                                                    {/* Mobile Layout - Unified Standard */}
                                                    <HabitaTD className="md:hidden pt-4 pb-2">
                                                        <div className="flex flex-col gap-3 w-full">
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-slate-700 text-sm leading-tight tracking-tight">Unidade {pkg.unitId}</span>
                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{pkg.observation || 'Sem Observação'}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <HabitaBadge 
                                                                        variant={pkg.type === 'pacote' ? 'indigo' : pkg.type === 'envelope' ? 'warning' : 'success'} 
                                                                        size="xs"
                                                                    >
                                                                        {pkg.type.toUpperCase()}
                                                                    </HabitaBadge>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] text-slate-400 font-black italic">{new Date(pkg.arrivalDate).toLocaleDateString()} {new Date(pkg.arrivalDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                <div className="flex items-center gap-2">
                                                                    {pkg.status === 'aguardando' && canManagePackages && (
                                                                        <HabitaIconActionButton
                                                                            icon={<CheckCircle2 />}
                                                                            variant="success"
                                                                            size="sm"
                                                                            tooltip="Marcar como Entregue"
                                                                            onClick={(e) => { e.stopPropagation(); markAsDelivered(pkg); }}
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </HabitaTD>

                                                    {/* Desktop Layout */}
                                                    <HabitaTD className="hidden md:table-cell text-center">
                                                        <span className="inline-flex items-center justify-center w-10 h-10 bg-slate-50 rounded-xl text-slate-700 font-black text-xs border border-slate-100">
                                                            {pkg.unitId}
                                                        </span>
                                                    </HabitaTD>
                                                    <HabitaTD className="hidden md:table-cell">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-black text-slate-700 uppercase tracking-tight">Unidade {pkg.unitId}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[200px]">{pkg.observation || 'Sem Observação'}</span>
                                                        </div>
                                                    </HabitaTD>
                                                    <HabitaTD className="hidden md:table-cell text-center">
                                                        <HabitaBadge 
                                                            variant={pkg.type === 'pacote' ? 'indigo' : pkg.type === 'envelope' ? 'warning' : 'success'} 
                                                            size="xs"
                                                        >
                                                            {pkg.type.toUpperCase()}
                                                        </HabitaBadge>
                                                    </HabitaTD>
                                                    <HabitaTD className="hidden md:table-cell text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-xs font-bold text-slate-600">{new Date(pkg.arrivalDate).toLocaleDateString()}</span>
                                                            <span className="text-[9px] font-black text-slate-400 uppercase">{new Date(pkg.arrivalDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    </HabitaTD>
                                                    <HabitaTD className="hidden md:table-cell text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {pkg.status === 'aguardando' && canManagePackages && (
                                                                <HabitaIconActionButton
                                                                    icon={<CheckCircle2 />}
                                                                    variant="success"
                                                                    size="sm"
                                                                    tooltip="Marcar como Entregue"
                                                                    onClick={(e) => { e.stopPropagation(); markAsDelivered(pkg); }}
                                                                />
                                                            )}
                                                            <HabitaIconActionButton
                                                                icon={<Trash2 />}
                                                                variant="danger"
                                                                size="sm"
                                                                tooltip="Excluir"
                                                                onClick={(e) => { e.stopPropagation(); setIsDeletingPackage(pkg.id); }}
                                                            />
                                                        </div>
                                                    </HabitaTD>
                                                </HabitaTR>
                                            ))
                                        ) : (
                                            <HabitaTR>
                                                <HabitaTD colSpan={5} className="py-24 text-center">
                                                    <div className="flex flex-col items-center justify-center text-slate-200">
                                                        <PackageOpen size={48} className="mb-4 opacity-20" />
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Nenhum Registro Ativo</span>
                                                    </div>
                                                </HabitaTD>
                                            </HabitaTR>
                                        )
                                    ) : (
                                        filteredAccess.length > 0 ? (
                                            filteredAccess.map((a: any) => (
                                                <HabitaTR 
                                                    key={a.id} 
                                                    onClick={() => {
                                                        setSelectedAccessId(a.id);
                                                        if (window.innerWidth < 768) setShowMobileDetails(true);
                                                    }}
                                                    className={cn("cursor-pointer", selectedAccessId === a.id && "bg-indigo-50/50")}
                                                >
                                                    {/* Mobile Layout - Unified Standard */}
                                                    <HabitaTD className="md:hidden pt-4 pb-2">
                                                        <div className="flex flex-col gap-3 w-full">
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex flex-col">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-slate-700 text-sm leading-tight tracking-tight">{a.visitorName}</span>
                                                                        {a.targetUnitId && (units.find((u: any) => u.id === a.targetUnitId)?.vehicles?.length ?? 0) > 0 && (
                                                                            <Car size={10} className="text-indigo-400" />
                                                                        )}
                                                                    </div>
                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Unidade {a.targetUnitId || 'ADM'} • {a.document || 'Sem doc.'}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <HabitaBadge 
                                                                        variant={a.status === 'dentro' ? 'success' : a.status === 'pendente' ? 'indigo' : 'neutral'} 
                                                                        size="xs"
                                                                    >
                                                                        {a.status.toUpperCase()}
                                                                    </HabitaBadge>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <HabitaBadge 
                                                                    variant={a.type === 'prestador' ? 'indigo' : 'neutral'} 
                                                                    size="xs"
                                                                >
                                                                    {a.type.toUpperCase()}
                                                                </HabitaBadge>
                                                                <div className="flex items-center gap-2">
                                                                    {a.status === 'pendente' && canManageAllAccess && (
                                                                        <HabitaIconActionButton
                                                                            icon={<CheckCircle2 />}
                                                                            variant="success"
                                                                            size="sm"
                                                                            tooltip="Registrar Entrada"
                                                                            onClick={(e) => { e.stopPropagation(); handleAction(a.id, 'entry'); }}
                                                                        />
                                                                    )}
                                                                    {a.status === 'dentro' && canManageAllAccess && (
                                                                        <HabitaIconActionButton
                                                                            icon={<LogOut />}
                                                                            variant="danger"
                                                                            size="sm"
                                                                            tooltip="Registrar Saída"
                                                                            onClick={(e) => { e.stopPropagation(); handleAction(a.id, 'exit'); }}
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </HabitaTD>

                                                    {/* Desktop Layout */}
                                                    <HabitaTD className="hidden md:table-cell text-center">
                                                        <div className="relative inline-flex">
                                                            <span className="inline-flex items-center justify-center w-10 h-10 bg-slate-50 rounded-xl text-slate-700 font-black text-xs border border-slate-100">
                                                                {a.targetUnitId || 'ADM'}
                                                            </span>
                                                            {a.targetUnitId && (units.find((u: any) => u.id === a.targetUnitId)?.vehicles?.length ?? 0) > 0 && (
                                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                                                    <Car size={8} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </HabitaTD>
                                                    <HabitaTD className="hidden md:table-cell">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-black text-slate-700 uppercase tracking-tight">{a.visitorName}</span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">{a.document || 'Sem doc.'}</span>
                                                        </div>
                                                    </HabitaTD>
                                                    <HabitaTD className="hidden md:table-cell text-center">
                                                        <HabitaBadge 
                                                            variant={a.type === 'prestador' ? 'indigo' : 'neutral'} 
                                                            size="xs"
                                                        >
                                                            {a.type.toUpperCase()}
                                                        </HabitaBadge>
                                                    </HabitaTD>
                                                    <HabitaTD className="hidden md:table-cell text-center">
                                                        <HabitaBadge 
                                                            variant={a.status === 'dentro' ? 'success' : a.status === 'pendente' ? 'indigo' : 'neutral'} 
                                                            size="xs"
                                                        >
                                                            {a.status.toUpperCase()}
                                                        </HabitaBadge>
                                                    </HabitaTD>
                                                    <HabitaTD className="hidden md:table-cell text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {a.status === 'pendente' && canManageAllAccess && (
                                                                <HabitaIconActionButton
                                                                    icon={<CheckCircle2 />}
                                                                    variant="success"
                                                                    size="sm"
                                                                    tooltip="Registrar Entrada"
                                                                    onClick={(e) => { e.stopPropagation(); handleAction(a.id, 'entry'); }}
                                                                />
                                                            )}
                                                            {a.status === 'dentro' && canManageAllAccess && (
                                                                <HabitaIconActionButton
                                                                    icon={<LogOut />}
                                                                    variant="danger"
                                                                    size="sm"
                                                                    tooltip="Registrar Saída"
                                                                    onClick={(e) => { e.stopPropagation(); handleAction(a.id, 'exit'); }}
                                                                />
                                                            )}
                                                            <HabitaIconActionButton
                                                                icon={<Trash2 />}
                                                                variant="danger"
                                                                size="sm"
                                                                tooltip="Excluir"
                                                                onClick={(e) => { e.stopPropagation(); setIsDeleting(a.id); }}
                                                            />
                                                        </div>
                                                    </HabitaTD>
                                                </HabitaTR>
                                            ))
                                        ) : (
                                            <HabitaTR>
                                                <HabitaTD colSpan={5} className="py-24 text-center">
                                                    <div className="flex flex-col items-center justify-center text-slate-200">
                                                        <ShieldAlert size={48} className="mb-4 opacity-20" />
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Nenhum Registro Ativo</span>
                                                    </div>
                                                </HabitaTD>
                                            </HabitaTR>
                                        )
                                    )}
                                </HabitaTBody>
                            </HabitaTable>
                        </div>

                        {/* Right Column (30%) - Sidebar Details */}
                        <div className="lg:col-span-12 xl:col-span-3 lg:grid xl:block">
                        <div className="h-full border border-slate-100 shadow-sm overflow-hidden rounded-2xl flex flex-col bg-slate-50/20">
                            <div className="p-6 border-b border-slate-100 bg-white">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Painel de Detalhes</span>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                    {activeTab === 'packages' ? <PackageIcon size={16} className="text-emerald-500" /> : <Shield size={16} className="text-indigo-500" />}
                                    Inspecionar Registro
                                </h3>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                {renderDetailContent()}
                            </div>
                        </div>
                    </div>
                </div>
            </HabitaContainerContent>
            </HabitaContainer>

            {/* MODALS */}
            {/* Modal: Novo Acesso */}
            <HabitaModal
                isOpen={showAccessModal}
                onClose={() => setShowAccessModal(false)}
                title="Novo Registro de Autorização"
                size="lg"
            >
                <form className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <HabitaCombobox
                                label="Tipo de Acesso"
                                options={[
                                    { label: 'Visitante (Familiar / Amigo)', value: 'visitante' },
                                    { label: 'Prestador (Serviços / Manutenção)', value: 'prestador' }
                                ]}
                                value={type}
                                onChange={(val) => setType(val as 'visitante' | 'prestador')}
                                placeholder="Selecione o tipo..."
                            />

                            <HabitaInput
                                label="Nome Completo"
                                required
                                value={visitorName}
                                onChange={e => setVisitorName(e.target.value)}
                                placeholder="Nome do visitante ou prestador"
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <HabitaInput
                                    label="Documento (Opcional)"
                                    value={visitorDoc}
                                    onChange={e => setVisitorDoc(e.target.value)}
                                    placeholder="RG ou CPF"
                                />
                                <HabitaCombobox
                                    label="Unidade Destino"
                                    options={units.map((u: any) => ({ label: `Unidade ${u.id}`, value: u.id }))}
                                    value={targetUnitId}
                                    onChange={setTargetUnitId}
                                    disabled={!canManageAllAccess && !!profile?.unitId}
                                    placeholder="Selecione..."
                                    searchable={true}
                                />
                            </div>

                            {type === 'prestador' && (
                                <HabitaInput
                                    label="Empresa / Serviço"
                                    value={company}
                                    onChange={e => setCompany(e.target.value)}
                                    placeholder="Nome da prestadora"
                                    className="animate-in fade-in slide-in-from-top-2"
                                />
                            )}
                        </div>

                        <div className="space-y-8">
                            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed space-y-5">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Car size={16} className="text-indigo-500" /> Identificação do Veículo
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <HabitaInput
                                        label="Placa"
                                        placeholder="EX: ABC1D23"
                                        value={plate}
                                        onChange={e => setPlate(e.target.value.toUpperCase())}
                                        className="font-black"
                                    />
                                    <HabitaInput
                                        label="Modelo / Cor"
                                        placeholder="EX: Toyota Corolla Prata"
                                        value={vehicleModel}
                                        onChange={e => setVehicleModel(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed space-y-5">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <HistoryIcon size={16} className="text-blue-500" /> Período da Autorização
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <HabitaDatePicker
                                        label="Data Início"
                                        value={new Date(startDate + 'T12:00:00')}
                                        onChange={date => setStartDate(date.toISOString().split('T')[0])}
                                    />
                                    <HabitaDatePicker
                                        label="Data Fim"
                                        value={new Date(endDate + 'T12:00:00')}
                                        onChange={date => setEndDate(date.toISOString().split('T')[0])}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-slate-100">
                        <HabitaButton 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowAccessModal(false)} 
                            className="flex-1"
                        >
                            Cancelar
                        </HabitaButton>
                        <HabitaButton 
                            type="button"
                            onClick={handleSubmit} 
                            variant="primary" 
                            className="flex-[2]" 
                            icon={<CheckCircle2 size={18}/>}
                        >
                            Confirmar Cadastro
                        </HabitaButton>
                    </div>
                </form>
            </HabitaModal>

            {/* Modal: Registrar Encomenda */}
            <HabitaModal
                isOpen={showPackageModal}
                onClose={() => setShowPackageModal(false)}
                title="Registrar Nova Encomenda"
                size="md"
            >
                <form className="space-y-8">
                    <HabitaCombobox
                        label="Tipo de Volume"
                        options={[
                            { label: 'Pacote / Caixa', value: 'pacote' },
                            { label: 'Envelope / Documento', value: 'envelope' },
                            { label: 'Delivery / Alimentação', value: 'delivery' }
                        ]}
                        value={packageType}
                        onChange={(val) => setPackageType(val as 'pacote' | 'envelope' | 'delivery')}
                        placeholder="Selecione o tipo..."
                    />

                    <HabitaCombobox
                        label="Unidade de Destino"
                        options={units.map((u: any) => ({ label: `Unidade ${u.id}`, value: u.id }))}
                        value={pUnitId}
                        onChange={setPUnitId}
                        placeholder="Selecione a unidade..."
                        searchable={true}
                    />

                    <HabitaTextarea
                        label="Observações da Entrega"
                        value={packageObservation}
                        onChange={e => setPackageObservation(e.target.value)}
                        placeholder="Ex: Frágil, Urgente, Deixado com porteiro..."
                        rows={4}
                    />

                    <div className="flex gap-4 pt-4 border-t border-slate-100">
                        <HabitaButton 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowPackageModal(false)} 
                            className="flex-1"
                        >
                            Cancelar
                        </HabitaButton>
                        <HabitaButton 
                            type="button"
                            onClick={handlePackageSubmit} 
                            variant="primary" 
                            className="flex-[2]" 
                            icon={<CheckCircle2 size={18}/>}
                        >
                            Registrar Entrada
                        </HabitaButton>
                    </div>
                </form>
            </HabitaModal>

            {/* Modal de Detalhes Mobile */}
            <HabitaModal
                isOpen={showMobileDetails}
                onClose={() => setShowMobileDetails(false)}
                title="Inspecionar Registro"
                size="md"
                className="lg:hidden"
            >
                <div className="py-2">
                    {renderDetailContent()}
                </div>
            </HabitaModal>

            {/* Modal: Confirmação de Exclusão Acesso */}
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
                        <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Deseja excluir este acesso?</h4>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed px-4">Esta ação removerá permanentemente o registro de autorização do sistema.</p>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <HabitaButton variant="outline" onClick={() => setIsDeleting(null)} className="flex-1">Voltar</HabitaButton>
                        <HabitaButton 
                            variant="danger" 
                            onClick={() => isDeleting && handleDelete(isDeleting)} 
                            className="flex-1"
                        >
                            Excluir
                        </HabitaButton>
                    </div>
                </div>
            </HabitaModal>

            {/* Modal: Confirmação de Exclusão Pacote */}
            <HabitaModal
                isOpen={!!isDeletingPackage}
                onClose={() => setIsDeletingPackage(null)}
                title="Excluir Encomenda"
                size="sm"
            >
                <div className="text-center space-y-6">
                    <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
                        <Trash2 size={32} />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Remover Registro?</h4>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed px-4">O registro desta encomenda será permanentemente removido da base de dados.</p>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <HabitaButton variant="outline" onClick={() => setIsDeletingPackage(null)} className="flex-1">Sair</HabitaButton>
                        <HabitaButton 
                            variant="danger" 
                            onClick={() => isDeletingPackage && handleDeletePackage(isDeletingPackage)} 
                            className="flex-1"
                        >
                            Confirmar
                        </HabitaButton>
                    </div>
                </div>
            </HabitaModal>

            {/* Global Search Feature */}
            <QuickSearchModal
                isOpen={showQuickSearch}
                onClose={() => setShowQuickSearch(false)}
                onSelectUnit={(unitId) => {
                    setSearchParams({ tab: 'access' });
                    setViewMode('active');
                    setSearchTerm(unitId);
                    setSelectedAccessId(null);
                }}
                onSelectAccess={(accId, uId, status, name) => {
                    setSearchParams({ tab: 'access' });
                    setViewMode(status === 'concluido' ? 'history' : 'active');
                    setSearchTerm(name || uId);
                    setSelectedAccessId(accId);
                }}
            />
        </div>
    );
}
