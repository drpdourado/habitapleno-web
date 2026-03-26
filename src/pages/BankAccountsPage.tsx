import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import type { BankAccount } from '../contexts/AppContext';
import { HabitaTable, HabitaTHead, HabitaTBody, HabitaTR, HabitaTH, HabitaTD } from '../components/ui/HabitaTable';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaInput } from '../components/ui/HabitaForm';
import { HabitaCombobox } from '../components/ui/HabitaCombobox';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaStatGrid } from '../components/ui/HabitaStatGrid';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { Landmark, Plus, Pencil, Trash2, ShieldAlert, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../utils/FinanceUtils';

const BankAccountsPage: React.FC = () => {
    const { bankAccounts, addBankAccount, updateBankAccount, deleteBankAccount } = useApp();
    const { showToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
    
    // Form State
    const [name, setName] = useState('');
    const [type, setType] = useState<'corrente' | 'poupanca' | 'investimento'>('corrente');
    const [initialBalance, setInitialBalance] = useState('');
    const [status, setStatus] = useState<'ativa' | 'inativa'>('ativa');
    const [isSaving, setIsSaving] = useState(false);

    const handleOpenModal = (account?: BankAccount) => {
        if (account) {
            setEditingAccount(account);
            setName(account.name);
            setType(account.type as any);
            setInitialBalance((account.initialBalance || 0).toString());
            setStatus(account.status as any);
        } else {
            setEditingAccount(null);
            setName('');
            setType('corrente');
            setInitialBalance('0');
            setStatus('ativa');
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const accountData: BankAccount = {
                id: editingAccount?.id || crypto.randomUUID(),
                name,
                type,
                initialBalance: parseFloat(initialBalance) || 0,
                currentBalance: editingAccount ? editingAccount.currentBalance : (parseFloat(initialBalance) || 0),
                status
            };

            if (editingAccount) {
                await updateBankAccount(accountData);
            } else {
                await addBankAccount(accountData);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving bank account:", error);
            showToast("Erro ao salvar conta bancária.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Tem certeza que deseja excluir esta conta?")) {
            try {
                await deleteBankAccount(id);
                showToast("Conta bancária excluída com sucesso!", "success");
            } catch (error) {
                console.error("Error deleting bank account:", error);
                showToast("Erro ao excluir conta bancária.", "error");
            }
        }
    };

    return (
        <div className="w-full animate-in fade-in duration-500 pb-12">
            <HabitaContainer>
                <HabitaContainerHeader 
                    title="Gestão de Contas"
                    subtitle="Configure os bancos e contas do condomínio para os lançamentos financeiros."
                    icon={<Landmark size={24} />}
                    actions={
                        <HabitaButton 
                            onClick={() => handleOpenModal()} 
                            icon={<Plus size={18} />}
                            className="bg-slate-900 border-slate-900 shadow-sm"
                        >
                            NOVA CONTA
                        </HabitaButton>
                    }
                />

                <HabitaContainerContent padding="none">
                    <div className="p-3 md:p-8 flex flex-col gap-4 md:gap-8">
                        {/* Summary Section */}
                        <HabitaStatGrid 
                            title="Resumo de Saldos e Contas"
                            icon={<Landmark />}
                            metrics={[
                                {
                                    label: "TOTAL DE CONTAS",
                                    value: bankAccounts.length,
                                    icon: <Landmark />,
                                    variant: "slate",
                                    subtext: "Cadastradas"
                                },
                                {
                                    label: "SALDO CONSOLIDADO",
                                    value: formatCurrency(bankAccounts.reduce((acc, a) => acc + a.currentBalance, 0)),
                                    icon: <TrendingUp />,
                                    variant: "emerald",
                                    subtext: "Disponível"
                                },
                                {
                                    label: "CONTAS ATIVAS",
                                    value: bankAccounts.filter(a => a.status === 'ativa').length,
                                    icon: <Landmark />,
                                    variant: "indigo",
                                    subtext: "Em Operação"
                                },
                                {
                                    label: "MAIOR SALDO",
                                    value: formatCurrency(Math.max(...bankAccounts.map(a => a.currentBalance), 0)),
                                    icon: <Landmark />,
                                    variant: "amber",
                                    subtext: "Destaque"
                                }
                            ]}
                            cols={4}
                        />

                        {/* Accounts Table - Enterprise Style */}
                        <div className="bg-white overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                            <div className="p-4 md:p-6 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Landmark size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Contas e Investimentos Habilitados</span>
                                </div>
                            </div>

                            <HabitaTable
                                isEmpty={bankAccounts.length === 0}
                                emptyMessage="Nenhuma conta bancária cadastrada."
                                responsive
                                containerClassName="border-none rounded-none shadow-none"
                            >
                                <HabitaTHead>
                                    <HabitaTR>
                                        <HabitaTH>Instituição</HabitaTH>
                                        <HabitaTH>Tipo</HabitaTH>
                                        <HabitaTH align="right">Saldo Inicial</HabitaTH>
                                        <HabitaTH align="right">Saldo Atual</HabitaTH>
                                        <HabitaTH align="center">Status</HabitaTH>
                                        <HabitaTH align="right">Ações</HabitaTH>
                                    </HabitaTR>
                                </HabitaTHead>
                                <HabitaTBody>
                                    {bankAccounts.map((account) => (
                                        <HabitaTR key={account.id} className="group">
                                            <HabitaTD label="Instituição">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                                        <Landmark size={14} />
                                                    </div>
                                                    <span className="font-bold text-slate-900">{account.name}</span>
                                                </div>
                                            </HabitaTD>
                                            <HabitaTD label="Tipo" className="capitalize text-slate-500 font-medium">
                                                {account.type}
                                            </HabitaTD>
                                            <HabitaTD label="Saldo Inicial" align="right" className="font-mono text-slate-400 text-xs">
                                                {formatCurrency(account.initialBalance)}
                                            </HabitaTD>
                                            <HabitaTD label="Saldo Atual" align="right" className="font-black text-slate-900 font-mono">
                                                {formatCurrency(account.currentBalance)}
                                            </HabitaTD>
                                            <HabitaTD label="Status" align="center">
                                                <HabitaBadge 
                                                    variant={account.status === 'ativa' ? 'success' : 'neutral'}
                                                    className="font-black tracking-widest px-3"
                                                >
                                                    {account.status === 'ativa' ? 'ATIVA' : 'INATIVA'}
                                                </HabitaBadge>
                                            </HabitaTD>
                                            <HabitaTD label="Ações" align="right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <HabitaButton 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => handleOpenModal(account)} 
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Pencil size={16} className="text-slate-400 group-hover:text-indigo-600" />
                                                    </HabitaButton>
                                                    <HabitaButton 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => handleDelete(account.id)} 
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Trash2 size={16} className="text-slate-400 group-hover:text-rose-600" />
                                                    </HabitaButton>
                                                </div>
                                            </HabitaTD>
                                        </HabitaTR>
                                    ))}
                                </HabitaTBody>
                            </HabitaTable>
                        </div>
                    </div>
                </HabitaContainerContent>
            </HabitaContainer>

            <HabitaModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingAccount ? "Editar Conta" : "Nova Conta Bancária"}
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <HabitaButton variant="ghost" onClick={() => setIsModalOpen(false)}>
                            CANCELAR
                        </HabitaButton>
                        <HabitaButton 
                            variant="primary" 
                            onClick={handleSave}
                            isLoading={isSaving}
                        >
                            {editingAccount ? "SALVAR ALTERAÇÕES" : "CADASTRAR CONTA"}
                        </HabitaButton>
                    </div>
                }
            >
                <form onSubmit={handleSave} className="space-y-4 py-2">
                    <HabitaInput
                        label="Nome da Instituição"
                        value={name}
                        onChange={(e: any) => setName(e.target.value)}
                        placeholder="Ex: Banco do Brasil, Inter, Nubank..."
                        required
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <HabitaCombobox
                            label="Tipo de Conta"
                            options={[
                                { value: 'corrente', label: 'Conta Corrente' },
                                { value: 'poupanca', label: 'Poupança' },
                                { value: 'investimento', label: 'Investimento' }
                            ]}
                            value={type}
                            onChange={setType}
                        />
                        <HabitaCombobox
                            label="Status"
                            options={[
                                { value: 'ativa', label: 'Ativa' },
                                { value: 'inativa', label: 'Inativa' }
                            ]}
                            value={status}
                            onChange={setStatus}
                        />
                    </div>

                    <HabitaInput
                        label="Saldo Inicial (R$)"
                        type="number"
                        step="0.01"
                        value={initialBalance}
                        onChange={(e: any) => setInitialBalance(e.target.value)}
                        placeholder="0,00"
                        required
                    />

                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                        <ShieldAlert className="text-amber-600 shrink-0" size={20} />
                        <p className="text-xs text-amber-800 leading-relaxed font-normal">
                            O **Saldo Inicial** é utilizado para o cálculo histórico. Transações anteriores a este cadastro não serão contabilizadas automaticamente.
                        </p>
                    </div>
                </form>
            </HabitaModal>
        </div>
    );
};

export default BankAccountsPage;
