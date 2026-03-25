import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Users, Smartphone, Building, X, ArrowRight, SearchCheck, Car } from 'lucide-react';
import { systemService } from '../services/SystemService';
import { type UserProfile } from '../utils/FirebaseUtils';
import { useApp } from '../contexts/AppContext';
import { currentCondominiumId } from '../utils/FirebaseUtils';
import { clsx } from 'clsx';

interface QuickSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectUnit?: (unitId: string) => void;
    onSelectAccess?: (accessId: string, unitId: string, status: string, name: string) => void;
}

interface SearchResult {
    id: string; // Unique ID for list rendering
    name: string;
    unitId: string;
    accessId?: string;
    accessStatus?: string;
    type: 'titular' | 'morador_app' | 'dependente' | 'vehicle_plate';
    subType?: string; // e.g., "Filho", "Cônjuge"
    phone?: string;
    email?: string;
    vehicleDetail?: string; // plate + model for vehicle results
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({ isOpen, onClose, onSelectUnit, onSelectAccess }) => {
    const { units, accessControl } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [viewingUnitId, setViewingUnitId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // Initial Load of Users
    useEffect(() => {
        if (isOpen) {
            const loadData = async () => {
                try {
                    const res = await systemService.fetchAllUsers();
                    if (res.success && res.data) {
                        setAllUsers(res.data);
                    }
                } catch (err) {
                    console.error("Erro ao carregar usuários para busca rápida:", err);
                }
            };
            loadData();
            // Reset state
            setSearchTerm('');
            setSelectedIndex(0);
            setViewingUnitId(null);
            // Autofocus
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Search Logic
    const results = useMemo(() => {
        if (!searchTerm.trim() || searchTerm.length < 2) return [];

        const term = searchTerm.toLowerCase().trim();
        const found: SearchResult[] = [];

        // 1. Search in Units (Number match or Titular name)
        units.forEach(unit => {
            const isUnitMatch = unit.id === term || unit.id.toLowerCase() === term;
            const isNameMatch = unit.ownerName.toLowerCase().includes(term);

            if (isUnitMatch || isNameMatch) {
                found.push({
                    id: `unit-titular-${unit.id}`,
                    name: unit.ownerName,
                    unitId: unit.id,
                    type: 'titular'
                });

                if (isUnitMatch) {
                    unit.dependentes?.forEach((dep: any, idx: number) => {
                        found.push({
                            id: `unit-dep-${unit.id}-${idx}`,
                            name: dep.nome,
                            unitId: unit.id,
                            type: 'dependente',
                            subType: dep.tipo
                        });
                    });

                    allUsers.filter((u: any) => u.vinculos?.some((v: any) => v.unitId === unit.id && v.condominiumId === currentCondominiumId()))
                        .forEach(u => {
                            if (!found.some(f => f.id === `user-${u.uid}`)) {
                                found.push({
                                    id: `user-${u.uid}`,
                                    name: u.name || 'Sem Nome',
                                    unitId: unit.id,
                                    type: 'morador_app',
                                    email: u.email
                                });
                            }
                        });
                }
            }

            if (!isUnitMatch) {
                unit.dependentes?.forEach((dep: any, idx: number) => {
                    if (dep.nome.toLowerCase().includes(term)) {
                        found.push({
                            id: `unit-dep-${unit.id}-${idx}`,
                            name: dep.nome,
                            unitId: unit.id,
                            type: 'dependente',
                            subType: dep.tipo
                        });
                    }
                });
            }

            unit.vehicles?.forEach((veh: any, idx: number) => {
                const plateMatch = veh.plate.toLowerCase().includes(term);
                const modelMatch = veh.model && veh.model.toLowerCase().includes(term);
                
                if (plateMatch || modelMatch) {
                    found.push({
                        id: `unit-veh-${unit.id}-${idx}`,
                        name: `${veh.plate} • ${veh.model}`,
                        unitId: unit.id,
                        type: 'vehicle_plate',
                        vehicleDetail: `Titular: ${unit.ownerName}${veh.color ? ` • ${veh.color}` : ''}${veh.parkingSpace ? ` • Vaga ${veh.parkingSpace}` : ''}`
                    });
                }
            });
        });

        // 4. Search in Access Control (Visitors/Providers)
        accessControl.forEach((acc: any) => {
            const visitorMatch = acc.visitorName.toLowerCase().includes(term);
            const plateMatch = acc.plate && acc.plate.toLowerCase().includes(term);
            const modelMatch = acc.vehicleModel && acc.vehicleModel.toLowerCase().includes(term);

            if (visitorMatch || plateMatch || modelMatch) {
                // Check if already found as resident to avoid noise
                if (found.some(f => f.id === `access-${acc.id}`)) return;

                found.push({
                    id: `access-${acc.id}`,
                    name: (plateMatch || modelMatch) && !visitorMatch ? (acc.plate || acc.vehicleModel || 'Veículo') : acc.visitorName,
                    unitId: acc.targetUnitId || 'N/A',
                    accessId: acc.id,
                    accessStatus: acc.status,
                    type: 'vehicle_plate', 
                    vehicleDetail: `Autorização: ${acc.type.toUpperCase()}${acc.plate ? ` • Placa: ${acc.plate}` : ''}${acc.vehicleModel ? ` • Modelo: ${acc.vehicleModel}` : ''}`
                });
            }
        });

        // 3. Search in Users (Moradores com App)
        allUsers.forEach(user => {
            // Ensure user belongs to this condominium
            const hasVinculo = user.vinculos?.some((v: any) => v.condominiumId === currentCondominiumId());
            if (!hasVinculo) return;

            if (user.name?.toLowerCase().includes(term)) {
                // Find unitId from vinculos
                const unitId = user.vinculos?.find((v: any) => v.condominiumId === currentCondominiumId())?.unitId || 'N/A';

                // Avoid double counting if name is same as ownerName (usually they are different objects)
                // or just add them as app users
                found.push({
                    id: `user-${user.uid}`,
                    name: user.name,
                    unitId: unitId,
                    type: 'morador_app',
                    email: user.email
                });
            }
        });

        // Remove duplicates based on unique combination of name + unitId + type
        // but keep the list stable
        return found.slice(0, 20); // Limit to 20 results for performance and better UI
    }, [searchTerm, units, allUsers]);

    const handleSelect = (result: SearchResult) => {
        if (result.accessId && onSelectAccess) {
            onSelectAccess(result.accessId, result.unitId, result.accessStatus || 'pendente', result.name);
            onClose();
            return;
        }
        setViewingUnitId(result.unitId);
    };

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
            } else if (e.key === 'Enter') {
                if (results[selectedIndex]) {
                    handleSelect(results[selectedIndex]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedIndex, onClose, handleSelect]);

    // Scroll selected item into view
    useEffect(() => {
        if (resultsRef.current && results.length > 0) {
            const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [selectedIndex, results]);

    const handleConfirmUnit = (unitId: string) => {
        if (onSelectUnit) {
            onSelectUnit(unitId);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-start justify-center pt-20 px-4">
            <div className={clsx(
                "bg-white rounded shadow-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 flex flex-col max-h-[85vh] transition-all duration-300",
                viewingUnitId ? "max-w-5xl" : "max-w-2xl"
            )}>

                {/* Search Header */}
                <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                    <Search className="text-slate-400" size={24} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setSelectedIndex(0);
                        }}
                        placeholder="Pesquisar por nome, titular, dependente ou placa..."
                        className="flex-1 h-12 bg-transparent text-lg font-bold text-slate-800 outline-none placeholder:text-slate-300 placeholder:font-medium"
                    />
                    <div className="flex items-center gap-2">
                        <span className="hidden sm:block text-[10px] font-black text-slate-300 uppercase tracking-widest bg-white border border-slate-200 px-2 py-1 rounded shadow-sm">ESC para sair</span>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Results Section */}
                <div
                    ref={resultsRef}
                    className="flex-1 overflow-y-auto p-2 custom-scrollbar"
                >
                    {viewingUnitId ? (
                        <div className="animate-in slide-in-from-right-4 duration-300 space-y-6 p-4">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                <button
                                    onClick={() => setViewingUnitId(null)}
                                    className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:translate-x-[-4px] transition-transform"
                                >
                                    <ArrowRight size={14} className="rotate-180" /> Voltar aos resultados
                                </button>
                                <span className="text-sm font-black text-slate-800 uppercase bg-blue-50 px-3 py-1 rounded-full">Unidade {viewingUnitId}</span>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Left Column: People Table */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                        <Users size={12} className="text-blue-500" />
                                        Residentes e Funcionários
                                    </h4>
                                    
                                    <div className="border border-slate-100 rounded overflow-hidden">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                                    <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Nome</th>
                                                    <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Vínculo</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {units.filter(u => u.id === viewingUnitId).map(unit => (
                                                    <React.Fragment key={`people-${unit.id}`}>
                                                        {/* Titular */}
                                                        <tr className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-4 py-3">
                                                                <span className="text-xs font-black text-slate-800 uppercase">{unit.ownerName}</span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100 font-black text-[8px] uppercase tracking-widest">Titular</span>
                                                            </td>
                                                        </tr>

                                                        {/* Dependents */}
                                                        {unit.dependentes?.map((dep: any, idx: number) => (
                                                            <tr key={`dep-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-4 py-3">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-bold text-slate-700">{dep.nome}</span>
                                                                        {dep.observacoes && <span className="text-[9px] text-slate-400 font-medium italic">{dep.observacoes}</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <span className="inline-block px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded border border-slate-200 font-black text-[8px] uppercase tracking-widest">{dep.tipo}</span>
                                                                </td>
                                                            </tr>
                                                        ))}

                                                        {/* App Users */}
                                                        {allUsers.filter((u: any) => u.vinculos?.some((v: any) => v.unitId === viewingUnitId && v.condominiumId === currentCondominiumId())).map((user: any) => (
                                                            <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors bg-blue-50/10">
                                                                <td className="px-4 py-3">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                                                                            {user.name} 
                                                                            <Smartphone size={10} className="text-blue-500" />
                                                                        </span>
                                                                        <span className="text-[9px] text-slate-400 font-medium lowercase tracking-tight">{user.email}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <span className="inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 font-black text-[8px] uppercase tracking-widest">App Ativo</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Right Column: Vehicles Table */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                        <Car size={12} className="text-indigo-500" />
                                        Veículos Cadastrados
                                    </h4>

                                    <div className="border border-indigo-50/50 rounded overflow-hidden">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-indigo-50/30 border-b border-indigo-50">
                                                    <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Placa / Modelo</th>
                                                    <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Vaga / Detalhes</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {units.filter(u => u.id === viewingUnitId).map(unit => (
                                                    (!unit.vehicles || unit.vehicles.length === 0) ? (
                                                        <tr key={`no-veh-${unit.id}`}>
                                                            <td colSpan={2} className="px-4 py-8 text-center">
                                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Nenhum veículo registrado</span>
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        unit.vehicles.map((veh: any, vIdx: number) => (
                                                            <tr key={`veh-${vIdx}`} className="hover:bg-indigo-50/10 transition-colors">
                                                                <td className="px-4 py-3">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{veh.plate}</span>
                                                                        <span className="text-[9px] text-indigo-500 font-black uppercase tracking-tight">{veh.model}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <div className="flex flex-col items-end">
                                                                        <span className="text-[10px] font-bold text-slate-700">{veh.parkingSpace ? `Vaga ${veh.parkingSpace}` : 'Sem Vaga'}</span>
                                                                        <span className="text-[9px] text-slate-400 font-medium uppercase">{veh.color}</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={() => handleConfirmUnit(viewingUnitId)}
                                    className="w-full h-12 bg-blue-600 text-white rounded font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <SearchCheck size={20} /> Ver na Portaria
                                </button>
                            </div>
                        </div>
                    ) : searchTerm.length < 2 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                                <Search className="text-slate-200" size={32} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-black text-slate-400 uppercase tracking-tight">Busca Global</p>
                                <p className="text-xs text-slate-400 font-medium">Digite pelo menos 2 caracteres ou o nº da unidade</p>
                            </div>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100">
                                <X className="text-rose-200" size={32} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-black text-slate-400 uppercase tracking-tight">Nenhum resultado encontrado</p>
                                <p className="text-xs text-slate-400 font-medium">Tente buscar por nome ou Unidade (ex: 402)</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {results.map((result, index) => (
                                <div
                                    key={result.id}
                                    onClick={() => handleSelect(result)}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={clsx(
                                        "p-4 rounded border transition-all cursor-pointer flex items-center justify-between group",
                                        index === selectedIndex
                                            ? "bg-blue-600 border-blue-600 shadow-md translate-x-1"
                                            : "bg-white border-transparent hover:bg-slate-50"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={clsx(
                                            "w-10 h-10 rounded flex items-center justify-center shadow-sm",
                                            index === selectedIndex ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-500"
                                        )}>
                                            {result.type === 'titular' && <Building size={20} />}
                                            {result.type === 'morador_app' && <Smartphone size={20} />}
                                            {result.type === 'dependente' && <Users size={20} />}
                                            {result.type === 'vehicle_plate' && <Car size={20} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className={clsx(
                                                    "text-sm font-black uppercase tracking-tight",
                                                    index === selectedIndex ? "text-white" : "text-slate-800"
                                                )}>
                                                    {result.name}
                                                </h3>
                                                <span className={clsx(
                                                    "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border",
                                                    index === selectedIndex
                                                        ? "bg-blue-500 border-blue-400 text-white"
                                                        : "bg-slate-50 border-slate-200 text-slate-400"
                                                )}>
                                                    {result.type === 'titular' ? 'Titular' : result.type === 'morador_app' ? 'App User' : result.type === 'vehicle_plate' ? 'Veículo' : result.subType || 'Dependente'}
                                                </span>
                                            </div>
                                            <p className={clsx(
                                                "text-[10px] font-bold uppercase tracking-widest mt-0.5",
                                                index === selectedIndex ? "text-blue-100" : "text-slate-400"
                                            )}>
                                                Unidade {result.unitId} {result.email ? `• ${result.email}` : ''}{result.vehicleDetail ? `• ${result.vehicleDetail}` : ''}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className={clsx(
                                            "flex flex-col items-end opacity-0 group-hover:opacity-100 transition-opacity",
                                            index === selectedIndex ? "text-white" : "text-slate-400"
                                        )}>
                                            <span className="text-[8px] font-black uppercase tracking-widest">Ver Detalhes</span>
                                            <ArrowRight size={16} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Tips */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1"><span className="bg-white border border-slate-200 px-1 py-0.5 rounded shadow-xs text-slate-600">↓↑</span> navegar</span>
                        <span className="flex items-center gap-1"><span className="bg-white border border-slate-200 px-1 py-0.5 rounded shadow-xs text-slate-600">ENTER</span> selecionar</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
