import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Building2, LogOut } from 'lucide-react';
import { HabitaSpinner } from './ui/HabitaSpinner';

interface CondoInfo {
    id: string;
    nome: string;
    cidade?: string;
    uf?: string;
    role?: string;
}

export const CondoSelector: React.FC = () => {
    // Auth context - fallback for cleaning
    const { pendingVinculos, switchVinculo, signOut } = (window as any).authContext || {
        pendingVinculos: [],
        switchVinculo: (_i: number) => {},
        signOut: () => {}
    };

    const [condos, setCondos] = useState<(CondoInfo & { vinculoIndex: number })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCondos = async () => {
            if (!pendingVinculos || pendingVinculos.length === 0) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const response = await api.get('/condos');
                const allCondos: any[] = response.data || [];

                // Map back to pendingVinculos
                const mappedCondos = pendingVinculos.map((vinculo: any, index: number) => {
                    const condoData = allCondos.find((c: any) => c.id === vinculo.condominiumId);
                    return {
                        id: vinculo.condominiumId,
                        nome: condoData?.name || condoData?.condoName || 'Condomínio Desconhecido',
                        cidade: condoData?.cidade || condoData?.city,
                        uf: condoData?.uf || condoData?.state,
                        vinculoIndex: index,
                        role: vinculo.role
                    };
                });

                setCondos(mappedCondos);
            } catch (error) {
                console.error("Erro ao buscar nomes dos condomínios:", error);
                // Fallback using vinculo data if available
                const fallback = pendingVinculos.map((v: any, index: number) => ({
                    id: v.condominiumId,
                    nome: 'Condomínio ' + v.condominiumId.substring(0, 4),
                    vinculoIndex: index,
                    role: v.role
                }));
                setCondos(fallback);
            } finally {
                setLoading(false);
            }
        };

        fetchCondos();
    }, [pendingVinculos]);

    const handleSelect = (index: number) => {
        switchVinculo(index);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[200] animate-in fade-in duration-300">
            <div className="bg-white rounded shadow-2xl border border-slate-200 w-full max-w-md p-8 relative animate-in zoom-in-95 duration-300">
                <div className="text-center mb-4">
                    <div className="w-16 h-16 bg-slate-50 text-indigo-600 rounded flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
                        <Building2 size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Selecionar Condomínio</h2>
                    <p className="text-slate-500 font-medium mt-2 text-sm">
                        Sua conta possui acesso a múltiplos condomínios.
                    </p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <HabitaSpinner size="lg" className="mb-4" />
                        <span className="text-slate-500 text-sm font-medium">Buscando informações...</span>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                        {condos.map((c) => (
                            <button
                                key={c.vinculoIndex}
                                onClick={() => handleSelect(c.vinculoIndex)}
                                className="w-full bg-slate-50 hover:bg-emerald-50 text-left px-5 py-4 border border-slate-200 hover:border-emerald-200 rounded transition-all group flex items-start gap-3 active:scale-[0.98] shadow-sm"
                            >
                                <div className="mt-1 w-8 h-8 rounded bg-white flex items-center justify-center shadow-sm text-slate-400 group-hover:text-emerald-500 border border-slate-100 transition-colors">
                                    <Building2 size={16} />
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors line-clamp-1">{c.nome}</div>
                                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                        <span className="uppercase tracking-widest font-bold text-[9px] bg-slate-200 group-hover:bg-emerald-100 px-2 py-0.5 rounded text-slate-600 group-hover:text-emerald-700 transition-colors">
                                            {c.role === 'admin' ? 'Síndico' : c.role === 'operator' ? 'Portaria' : c.role === 'zelador' ? 'Zelador' : 'Morador'}
                                        </span>
                                        {c.cidade && c.uf && (
                                            <span className="opacity-75">{c.cidade} - {c.uf}</span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                <div className="mt-6 pt-6 border-t border-slate-100">
                    <button
                        onClick={signOut}
                        className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-500 font-medium text-sm transition-colors py-2"
                    >
                        <LogOut size={16} />
                        Sair da conta
                    </button>
                </div>
            </div>
        </div>
    );
};
