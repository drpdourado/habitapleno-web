import { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Trash2, Eye, Calendar, History, X } from 'lucide-react';
import { hasPermission } from '../utils/rbac';

// UI Components
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaTable, HabitaTHead, HabitaTBody, HabitaTR, HabitaTH, HabitaTD } from '../components/ui/HabitaTable';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { HabitaMonthPicker } from '../components/ui/HabitaMonthPicker';
import { HabitaIconActionButton } from '../components/ui/HabitaIconActionButton';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaHeading } from '../components/ui/HabitaHeading';
import { formatCurrency } from '../utils/FinanceUtils';

const HistoryPage = () => {
    const { visibleHistory: history, deleteHistoryRecord, isMonthClosed } = useApp();
    const { profile, accessProfile } = useAuth();
    const navigate = useNavigate();
    const [filterRef, setFilterRef] = useState<string>('');

    const filteredHistory = useMemo(() => {
        if (!filterRef) return history;
        const [year, month] = filterRef.split('-');
        const target = `${month}/${year}`;
        return history.filter(h => h.referenceMonth === target);
    }, [history, filterRef]);

    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);
    const [refMonthToDelete, setRefMonthToDelete] = useState<string | null>(null);

    const handleDeleteClick = (id: string, refMonth: string) => {
        if (isMonthClosed(refMonth)) {
            setIsAlertModalOpen(true);
            return;
        }
        setIdToDelete(id);
        setRefMonthToDelete(refMonth);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (idToDelete) {
            deleteHistoryRecord(idToDelete);
            setIsDeleteModalOpen(false);
            setIdToDelete(null);
            setRefMonthToDelete(null);
        }
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="w-full animate-in fade-in duration-500 pb-16">
            <HabitaContainer>
                <HabitaContainerHeader 
                    title="Histórico de Fechamentos"
                    subtitle="Monitoramento dos ciclos encerrados de consumo"
                    icon={<History size={24} />}
                    actions={
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="w-full sm:w-48">
                                <HabitaMonthPicker
                                    value={filterRef}
                                    onChange={setFilterRef}
                                    placeholder="Filtrar Mês"
                                />
                            </div>
                            
                            {filterRef && (
                                <HabitaButton
                                    variant="ghost"
                                    onClick={() => setFilterRef('')}
                                    icon={<X size={14} />}
                                    className="h-9 px-3 text-slate-400 hover:text-rose-500"
                                >
                                    Limpar
                                </HabitaButton>
                            )}
                            
                            <HabitaBadge variant="neutral" size="sm" className="bg-slate-900 text-white border-none py-1 px-3 md:py-1.5 md:px-4 font-bold md:font-black text-[9px] md:text-[10px] whitespace-nowrap">
                                {filteredHistory.length} <span className="hidden sm:inline">{filteredHistory.length === 1 ? 'Mês Registrado' : 'Meses Registrados'}</span>
                                <span className="sm:hidden">{filteredHistory.length === 1 ? 'Mês' : 'Meses'}</span>
                            </HabitaBadge>
                        </div>
                    }
                />

                <HabitaContainerContent padding="md">
                    <HabitaTable responsive mobileVariant="list">
                        <HabitaTHead>
                            <HabitaTR>
                                <HabitaTH>Mês de Referência</HabitaTH>
                                <HabitaTH>Data da Apuração</HabitaTH>
                                <HabitaTH>Unidades</HabitaTH>
                                <HabitaTH align="right">
                                    {hasPermission(accessProfile, 'history', 'all') ? 'Total Arrecadado' : 'Meu Total'}
                                </HabitaTH>
                                <HabitaTH align="center">Status</HabitaTH>
                                <HabitaTH align="right">Ações</HabitaTH>
                            </HabitaTR>
                        </HabitaTHead>
                        <HabitaTBody>
                            {filteredHistory.map((record) => {
                                const canSeeAll = hasPermission(accessProfile, 'history', 'all');
                                const units = record.units || [];
                                const visibleUnits = canSeeAll
                                    ? units
                                    : units.filter(u => u.id === profile?.unitId);

                                const totalCollected = visibleUnits.reduce((acc, unit) => {
                                    return acc + (unit.calculatedTotal || 0);
                                }, 0);

                                const isClosed = isMonthClosed(record.referenceMonth);

                                return (
                                    <HabitaTR key={record.id}>
                                        <HabitaTD label="Mês / Referência" className="font-black text-slate-700">
                                            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-indigo-500" />
                                                    {record.referenceMonth}
                                                </div>
                                                <div className="flex items-center gap-2 md:hidden">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{record.closedAt ? formatDate(record.closedAt) : '—'}</span>
                                                    {isClosed ? (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                    ) : (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    )}
                                                </div>
                                            </div>
                                        </HabitaTD>
                                        
                                        <HabitaTD label="Data da Apuração" className="hidden md:table-cell font-medium text-slate-500 text-xs">
                                            {record.closedAt ? formatDate(record.closedAt) : '—'}
                                        </HabitaTD>
                                        
                                        <HabitaTD label="Unidades" className="hidden md:table-cell">
                                            <HabitaBadge variant="neutral" size="sm">
                                                {visibleUnits.length} Unidades
                                            </HabitaBadge>
                                        </HabitaTD>
                                        
                                        <HabitaTD label={canSeeAll ? "Arrecadado" : "Valor"} align="right" className="font-bold text-slate-700">
                                            {formatCurrency(totalCollected)}
                                        </HabitaTD>
                                        
                                        <HabitaTD label="Status" align="center" className="hidden md:table-cell">
                                            {isClosed ? (
                                                <HabitaBadge variant="indigo" size="sm">Consolidado</HabitaBadge>
                                            ) : (
                                                <HabitaBadge variant="success" size="sm">Aberto</HabitaBadge>
                                            )}
                                        </HabitaTD>
                                        
                                        <HabitaTD label="Ações" align="right">
                                            <div className="flex items-center justify-end gap-2">
                                                <HabitaIconActionButton
                                                    icon={<Eye />}
                                                    variant="ghost"
                                                    size="sm"
                                                    tooltip="Visualizar Detalhes"
                                                    className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                    onClick={() => navigate(`/history/${record.id}`)}
                                                />
                                                {canSeeAll && !isClosed && (
                                                    <HabitaIconActionButton
                                                        icon={<Trash2 />}
                                                        variant="ghost"
                                                        size="sm"
                                                        tooltip="Excluir Registro"
                                                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                        onClick={() => handleDeleteClick(record.id, record.referenceMonth)}
                                                    />
                                                )}
                                            </div>
                                        </HabitaTD>
                                    </HabitaTR>
                                );
                            })}
                        </HabitaTBody>
                    </HabitaTable>
                </HabitaContainerContent>
            </HabitaContainer>

            {/* Modal Período Protegido */}
            <HabitaModal
                isOpen={isAlertModalOpen}
                onClose={() => setIsAlertModalOpen(false)}
                title="Período Protegido"
                size="sm"
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-amber-100">
                        <History size={32} />
                    </div>
                    <HabitaHeading level={3} className="text-slate-800 mb-2">Ação Não Permitida</HabitaHeading>
                    <p className="text-slate-500 text-xs leading-relaxed">
                        Este mês está protegido por um <span className="font-bold text-slate-700">Snapshot de Segurança</span> e não permite exclusões. Destrave o mês na tela de Encerramento para realizar modificações.
                    </p>
                </div>
            </HabitaModal>

            {/* Modal de Confirmação de Exclusão */}
            <HabitaModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Excluir Apuração?"
                size="sm"
                footer={
                    <div className="flex gap-3 w-full sm:w-auto">
                        <HabitaButton variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                            Cancelar
                        </HabitaButton>
                        <HabitaButton 
                            variant="danger" 
                            onClick={confirmDelete}
                            icon={<Trash2 size={16} />}
                        >
                            Excluir Registro
                        </HabitaButton>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-rose-100">
                        <Trash2 size={32} />
                    </div>
                    <HabitaHeading level={3} className="text-slate-800 mb-2">Tem Certeza?</HabitaHeading>
                    <p className="text-slate-500 text-xs leading-relaxed">
                        Você está prestes a excluir a apuração de <span className="font-black text-slate-700">{refMonthToDelete}</span>. Esta ação não poderá ser desfeita e removerá todo o histórico de medições vinculadas a este período.
                    </p>
                </div>
            </HabitaModal>
        </div>
    );
};

export default HistoryPage;
