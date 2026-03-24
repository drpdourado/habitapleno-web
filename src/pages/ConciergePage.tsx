import { useState, useMemo, useEffect } from 'react';
import {
    Fingerprint,
    UserCheck,
    LogOut,
    Clock,
    ScanFace,
    UserSearch,
    Car
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { HabitaInput } from '../components/ui/HabitaForm';
import { HabitaTabs } from '../components/ui/HabitaTabs';
import { HabitaMobileTabs } from '../components/ui/HabitaMobileTabs';
import { HabitaCard } from '../components/ui/HabitaCard';
import { HabitaStatGrid } from '../components/ui/HabitaStatGrid';
import { HabitaSpinner } from '../components/ui/HabitaSpinner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Interfaces moved here since context is removed or to be safer
interface AccessControl {
    id: string;
    targetUnitId: string;
    visitorName: string;
    status: 'pendente' | 'dentro' | 'concluido';
    type: string;
    company?: string;
    startDate: string;
    endDate: string;
    plate?: string;
    vehicleModel?: string;
    createdAt?: string;
}

export function ConciergePage() {
    const [accessControl, setAccessControl] = useState<AccessControl[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [subTab, setSubTab] = useState<'ativos' | 'concluidos'>('ativos');

    // Get user from localStorage
    const user = JSON.parse(localStorage.getItem('@HabitaPleno:user') || '{}');
    const isAdmin = user.role === 'admin' || user.role === 'master' || user.role === 'adm';
    const isConcierge = user.role === 'concierge' || user.role === 'zelador' || user.role === 'operator';
    const hasWritePermission = isAdmin || isConcierge;

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [accessRes, unitsRes] = await Promise.all([
                api.get('/access-control'),
                api.get('/units')
            ]);
            setAccessControl(accessRes.data || []);
            setUnits(unitsRes.data || []);
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            toast.error('Erro ao carregar dados do concierge.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const authorizations = useMemo(() => {
        let list = [...(accessControl || [])];

        if (subTab === 'ativos') {
            list = list.filter(a => a.status === 'pendente' || a.status === 'dentro');
        } else {
            list = list.filter(a => a.status === 'concluido');
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase().trim();
            list = list.filter(a => {
                const unitMatch = a.targetUnitId && String(a.targetUnitId).toLowerCase().includes(term);
                const visitorMatch = a.visitorName.toLowerCase().includes(term);
                const plateMatch = a.plate && a.plate.toLowerCase().includes(term);

                const unitVehicles = a.targetUnitId ? units.find(u => String(u.id) === String(a.targetUnitId))?.vehicles : [];
                const unitPlateMatch = unitVehicles?.some((v: any) => v.plate.toLowerCase().includes(term));

                return unitMatch || visitorMatch || plateMatch || unitPlateMatch;
            });
        }

        return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }, [accessControl, subTab, searchTerm, units]);

    const handleEntry = async (a: AccessControl) => {
        if (!hasWritePermission) {
            toast.error('Você não tem permissão para esta ação.');
            return;
        }
        try {
            await api.post(`/access-control/${a.id}/entry`);
            toast.success('Entrada registrada com sucesso!');
            fetchData(); // Refresh list
        } catch (error) {
            toast.error('Erro ao registrar entrada.');
        }
    };

    const handleExit = async (a: AccessControl) => {
        if (!hasWritePermission) {
            toast.error('Você não tem permissão para esta ação.');
            return;
        }
        try {
            await api.post(`/access-control/${a.id}/exit`);
            toast.success('Saída registrada com sucesso!');
            fetchData(); // Refresh list
        } catch (error) {
            toast.error('Erro ao registrar saída.');
        }
    };

    if (isLoading) {
        return (
            <div className="w-full flex items-center justify-center p-20">
                <HabitaSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="w-full animate-in fade-in duration-700 pb-12">
            <HabitaContainer>
                <HabitaContainerHeader
                    title="Terminal Concierge"
                    subtitle="Gestão Operacional de Fluxo e Segurança"
                    icon={<Fingerprint size={24} />}
                />

                <div className="bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 px-5 md:px-8">
                    <div className="flex-1 w-full md:max-w-md py-4 md:py-6">
                        <div className="relative group">
                            <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors z-10" size={18} />
                            <HabitaInput
                                placeholder="Unidade, nome ou placa..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-12 h-12 bg-slate-50 border-slate-200"
                            />
                        </div>
                    </div>

                    <div className="md:border-l border-slate-100 md:pl-8 h-full flex flex-col justify-end">
                        <HabitaTabs
                            tabs={[
                                { id: 'ativos', label: 'Monitoramento', icon: <ScanFace size={16} /> },
                                { id: 'concluidos', label: 'Histórico', icon: <Clock size={16} /> }
                            ]}
                            activeTab={subTab}
                            onChange={(id) => setSubTab(id as 'ativos' | 'concluidos')}
                            className="border-none p-0 h-14 hidden md:flex"
                        />
                        <HabitaMobileTabs
                            tabs={[
                                { id: 'ativos', label: 'Ativos', icon: <ScanFace size={16} /> },
                                { id: 'concluidos', label: 'Histórico', icon: <Clock size={16} /> }
                            ]}
                            activeTab={subTab}
                            onChange={(id) => setSubTab(id as 'ativos' | 'concluidos')}
                            className="md:hidden pb-4"
                            label="Filtro de Acesso"
                        />
                    </div>
                </div>

                <HabitaContainerContent padding="md">
                    <div className="mb-8">
                        <HabitaStatGrid
                            title="Monitoramento Operacional em Tempo Real"
                            icon={<Fingerprint />}
                            metrics={[
                                {
                                    label: "PESSOAS DENTRO",
                                    value: accessControl.filter(a => a.status === 'dentro').length,
                                    icon: <UserCheck />,
                                    variant: "emerald",
                                    subtext: "No Condomínio"
                                },
                                {
                                    label: "PRÉ-AUTORIZADOS",
                                    value: accessControl.filter(a => a.status === 'pendente').length,
                                    icon: <ScanFace />,
                                    variant: "indigo",
                                    subtext: "Aguardando"
                                },
                                {
                                    label: "ENTRADAS HOJE",
                                    value: accessControl.filter(a => {
                                        const today = new Date().toISOString().split('T')[0];
                                        return a.status !== 'pendente' && (a.createdAt || '').startsWith(today);
                                    }).length,
                                    icon: <Clock />,
                                    variant: "amber",
                                    subtext: "Últimas 24h"
                                },
                                {
                                    label: "FLUXO TOTAL",
                                    value: accessControl.length,
                                    icon: <Fingerprint />,
                                    variant: "slate",
                                    subtext: "Controle Geral"
                                }
                            ]}
                            cols={4}
                        />
                    </div>

                    {authorizations.length === 0 ? (
                        <div className="bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 p-20 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                                <ScanFace size={40} className="text-slate-200" />
                            </div>
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Nenhum Registro Encontrado</h3>
                            <p className="text-xs text-slate-300 font-medium mt-2">Nenhuma autorização corresponde aos critérios de busca.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {authorizations.map(a => (
                                <HabitaCard
                                    key={a.id}
                                    className={cn(
                                        "group relative border-2 transition-all duration-300 overflow-hidden",
                                        a.status === 'dentro' ? "border-emerald-100 bg-emerald-50/10 shadow-emerald-50" :
                                            a.status === 'pendente' ? "border-indigo-100 bg-indigo-50/10 shadow-indigo-50" :
                                                "border-slate-100 opacity-60 grayscale-[0.5]"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <HabitaBadge
                                            variant={a.status === 'dentro' ? 'success' : a.status === 'pendente' ? 'indigo' : 'neutral'}
                                            size="xs"
                                        >
                                            {a.status === 'dentro' ? 'Ocupante (Dentro)' : a.status === 'pendente' ? 'Pré-Autorizado' : 'Finalizado'}
                                        </HabitaBadge>

                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Unidade</span>
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span className="text-xl font-black text-slate-800 tracking-tighter leading-none">{a.targetUnitId || 'ADM'}</span>
                                                {a.targetUnitId && (units.find(u => String(u.id) === String(a.targetUnitId))?.vehicles?.length ?? 0) > 0 && (
                                                    <div className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-200">
                                                        <Car size={10} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-8">
                                        <div>
                                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-tight mb-1 group-hover:text-indigo-600 transition-colors">
                                                {a.visitorName}
                                            </h2>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                                                    {a.type} {a.company && `• ${a.company}`}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-2 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Clock size={14} className="text-indigo-400" />
                                                <span className="text-[10px] font-bold uppercase">
                                                    Validade: {new Date(a.startDate).toLocaleDateString()} - {new Date(a.endDate).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {a.plate && (
                                                <div className="flex items-center gap-2 text-indigo-600">
                                                    <Car size={14} />
                                                    <span className="text-[10px] font-black uppercase">
                                                        {a.plate} • {a.vehicleModel}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        {a.status === 'pendente' && (
                                            <HabitaButton
                                                onClick={() => handleEntry(a)}
                                                disabled={!hasWritePermission}
                                                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-indigo-100 font-black disabled:opacity-50"
                                                icon={<UserCheck size={18} />}
                                            >
                                                Registrar Entrada
                                            </HabitaButton>
                                        )}
                                        {a.status === 'dentro' && (
                                            <HabitaButton
                                                onClick={() => handleExit(a)}
                                                disabled={!hasWritePermission}
                                                className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-rose-100 font-black disabled:opacity-50"
                                                icon={<LogOut size={18} />}
                                            >
                                                Registrar Saída
                                            </HabitaButton>
                                        )}
                                        {a.status === 'concluido' && (
                                            <div className="w-full h-12 bg-slate-50 text-slate-300 rounded-xl border border-slate-100 flex items-center justify-center font-black text-[10px] uppercase tracking-widest cursor-not-allowed">
                                                Acesso Finalizado
                                            </div>
                                        )}
                                    </div>
                                </HabitaCard>
                            ))}
                        </div>
                    )}
                </HabitaContainerContent>
            </HabitaContainer>
        </div>
    );
}

export default ConciergePage;
