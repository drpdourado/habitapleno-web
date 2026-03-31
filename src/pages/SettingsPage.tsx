import React, { useState } from 'react';
import { useApp, type UnitType, type Unit } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import {
    Plus, Trash2, Save, Download, ShieldAlert,
    Camera, X, Check, Pencil,
    Settings as SettingsIcon, ShieldCheck,
    ImageIcon, CreditCard, Layout, Database,
    Zap, Rocket, Crown, Star, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { usePlan } from '../hooks/usePlan';
import { planService, type SaaSPlan } from '../services/PlanService';
import * as dbUtils from '../utils/FirebaseUtils';
import { useToast } from '../contexts/ToastContext';
import { hasPermission } from '../utils/rbac';
import { clsx } from 'clsx';

// Habita Design System
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaSpinner } from '../components/ui/HabitaSpinner';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { HabitaCard, HabitaCardHeader, HabitaCardTitle } from '../components/ui/HabitaCard';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaInput, HabitaTextarea } from '../components/ui/HabitaForm';
import { HabitaIconActionButton } from '../components/ui/HabitaIconActionButton';
import { HabitaFileUpload } from '../components/ui/HabitaFileUpload';

const SettingsPage = () => {
    const { settings, updateSettings, tenantId, isLoading: contextLoading, error: contextError } = useApp();
    const { accessProfile } = useAuth();
    const { plan, loading: planLoading } = usePlan();
    const canManageSettings = hasPermission(accessProfile, 'settings', 'all');

    const [gasPriceInput, setGasPriceInput] = useState(settings?.gasPrice?.toString() || '0');
    const [condoNameInput, setCondoNameInput] = useState(settings?.name || settings?.condoName || '');
    const [systemNameInput, setSystemNameInput] = useState(settings?.systemName || '');
    const [cnpjInput, setCnpjInput] = useState(settings?.cnpj || '');
    const [addressInput, setAddressInput] = useState(settings?.address || '');
    const [pixKeyInput, setPixKeyInput] = useState(settings?.pixKey || '');
    const [pixBeneficiaryInput, setPixBeneficiaryInput] = useState(settings?.pixBeneficiary || '');
    const [globalMessageInput, setGlobalMessageInput] = useState(settings?.mensagemGlobalFatura || '');

    // Check for loading state
    if (contextLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <HabitaSpinner size="lg" label="Carregando configurações..." showLabel />
            </div>
        );
    }

    // Check for error state
    if (contextError) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6 border border-amber-100">
                    <AlertTriangle size={48} className="text-amber-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Ops! Algo deu errado</h2>
                <p className="text-slate-500 mt-2 font-medium max-w-sm">{contextError}</p>
                <HabitaButton className="mt-8 px-10 h-12" onClick={() => window.location.reload()}>Recarregar Página</HabitaButton>
            </div>
        );
    }

    const [isExporting, setIsExporting] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    const [newTypeName, setNewTypeName] = useState('');
    const [newTypeBase, setNewTypeBase] = useState('');

    const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
    const [editTypeName, setEditTypeName] = useState('');
    const [editTypeBase, setEditTypeBase] = useState('');
    const { showToast } = useToast();

    // Modal states
    const [showDeleteLogoConfirm, setShowDeleteLogoConfirm] = useState(false);
    const [showDeleteTypeConfirm, setShowDeleteTypeConfirm] = useState<{ isOpen: boolean, typeId: string | null }>({
        isOpen: false,
        typeId: null
    });

    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [availablePlans, setAvailablePlans] = useState<SaaSPlan[]>([]);
    const [isLoadingPlans, setIsLoadingPlans] = useState(false);
    const [isUpgradingPlan, setIsUpgradingPlan] = useState<string | null>(null);

    // Sync local state when settings evolve
    React.useEffect(() => {
        setGasPriceInput(settings?.gasPrice?.toString() || '0');
        setCondoNameInput(settings?.name || settings?.condoName || '');
        setSystemNameInput(settings?.systemName || '');
        setCnpjInput(settings?.cnpj || '');
        setAddressInput(settings?.address || '');
        setPixKeyInput(settings?.pixKey || '');
        setPixBeneficiaryInput(settings?.pixBeneficiary || '');
        setGlobalMessageInput(settings?.mensagemGlobalFatura || '');
    }, [settings]);

    const handleSaveGlobalParams = async () => {
        try {
            const payload = { ...settings };
            delete payload.modules;
            delete payload.activePlan;
            
            await updateSettings({
                ...payload,
                gasPrice: parseFloat(gasPriceInput) || 0,
                name: condoNameInput,
                condoName: condoNameInput,
                systemName: systemNameInput,
                cnpj: cnpjInput,
                address: addressInput,
                pixKey: pixKeyInput,
                pixBeneficiary: pixBeneficiaryInput,
                mensagemGlobalFatura: globalMessageInput
            });
            showToast('Configurações atualizadas com sucesso!', 'success');
        } catch (error) {
            console.error("Erro ao salvar configurações:", error);
            showToast('Ocorreu um erro ao salvar as configurações.', 'error');
        }
    };


    const handleRemoveLogo = () => {
        setShowDeleteLogoConfirm(true);
    };

    const confirmRemoveLogo = async () => {
        setShowDeleteLogoConfirm(false);
        setIsUploadingLogo(true);
        try {
            if (settings?.logotipoUrl) {
                await dbUtils.deleteFileFromStorage(settings.logotipoUrl);
            }
            const updatedSettings = { ...settings, logotipoUrl: '' };
            await updateSettings(updatedSettings);
            await dbUtils.saveFirestoreCondominium(tenantId, { logotipoUrl: '' });
            showToast('Logotipo removido.', 'info');
        } catch (error) {
            console.error("Erro ao remover logo:", error);
            showToast('Erro ao remover o logotipo.', 'error');
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const handleAddType = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTypeName || !newTypeBase) return;

        const newType: UnitType = {
            id: crypto.randomUUID(),
            name: newTypeName,
            baseFee: parseFloat(newTypeBase) || 0,
        };

        updateSettings({
            ...settings,
            unitTypes: [...(settings?.unitTypes || []), newType]
        });

        setNewTypeName('');
        setNewTypeBase('');
        showToast('Tipo de unidade adicionado', 'success');
    };

    const handleEditType = (type: UnitType) => {
        setEditingTypeId(type.id);
        setEditTypeName(type.name);
        setEditTypeBase(type.baseFee.toString());
    };

    const handleCancelEditType = () => {
        setEditingTypeId(null);
        setEditTypeName('');
        setEditTypeBase('');
    };

    const handleSaveEditType = async (id: string) => {
        if (!editTypeName || !editTypeBase) return;

        const updatedTypes = (settings?.unitTypes || []).map(t =>
            t.id === id ? {
                ...t,
                name: editTypeName,
                baseFee: parseFloat(editTypeBase) || 0,
            } : t
        );

        try {
            await updateSettings({
                ...settings,
                unitTypes: updatedTypes
            });
            setEditingTypeId(null);
            showToast('Tipo de unidade atualizado!', 'success');
        } catch (error) {
            console.error("Erro ao atualizar tipo de unidade:", error);
            showToast("Erro ao salvar alteração.", 'error');
        }
    };

    const handleDeleteType = (id: string) => {
        setShowDeleteTypeConfirm({ isOpen: true, typeId: id });
    };

    const confirmDeleteType = () => {
        const { typeId } = showDeleteTypeConfirm;
        if (!typeId) return;
        
        updateSettings({
            ...settings,
            unitTypes: (settings?.unitTypes || []).filter(t => t.id !== typeId)
        });
        showToast('Tipo removido com sucesso.', 'info');
        setShowDeleteTypeConfirm({ isOpen: false, typeId: null });
    };

    const handleOpenUpgradeModal = async () => {
        setIsUpgradeModalOpen(true);
        setIsLoadingPlans(true);
        try {
            const res = await planService.getAll();
            if (res.success && res.data) {
                setAvailablePlans(res.data);
            } else {
                showToast(res.error || 'Erro ao carregar planos disponíveis.', 'error');
            }
        } catch (error) {
            console.error("Erro ao carregar planos:", error);
            showToast('Erro técnico ao buscar planos.', 'error');
        } finally {
            setIsLoadingPlans(false);
        }
    };

    const handleSelectPlan = async (planId: string) => {
        if (planId === plan?.id) {
            showToast('Este já é o seu plano atual.', 'info');
            return;
        }

        setIsUpgradingPlan(planId);
        try {
            const res = await planService.assignPlanToCondo(tenantId, planId);
            if (res.success) {
                showToast('Solicitação de upgrade enviada com sucesso!', 'success');
                setIsUpgradeModalOpen(false);
                // O hook usePlan irá recarregar automaticamente via tenantId ou manual refresh se necessário
                // Mas como o doc de condominios mudou, o hook usePlan (que depende de tenantId) 
                // pode precisar de um trigger se ele não estiver ouvindo real-time.
                // No usePlan.ts atual ele usa useEffect com [tenantId].
                // Para forçar o reload imediato da UI sem refresh da página,
                // poderíamos recarregar o usePlan se ele expusesse um refresh().
                // Como não expõe, o usuário verá a mudança no próximo load ou se mudarmos o tenantId.
                // Vamos sugerir um reload ou apenas avisar.
                window.location.reload(); 
            } else {
                showToast(res.error || 'Erro ao processar upgrade.', 'error');
            }
        } catch (error) {
            console.error("Erro no upgrade:", error);
            showToast('Erro ao processar a solicitação.', 'error');
        } finally {
            setIsUpgradingPlan(null);
        }
    };

    const handleExportCSV = async () => {
        setIsExporting(true);
        try {
            const cloudData = await dbUtils.fetchAllData();
            const cloudUsers = await dbUtils.fetchAllFirestoreUsers();
            const cloudProfiles = await dbUtils.fetchAllAccessProfiles();

            const h = cloudData.history || [];
            const e = cloudData.expenses || [];
            const r = cloudData.revenues || [];
            const u = cloudData.units || [];
            const s = cloudData.settings || settings || {};
            const b = cloudData.balances || { cash: 0, bank: 0 };

            const separator = ';';
            const BOM = '\uFEFF';
            let csvContent = BOM;
            const safe = (val: any) => String(val ?? '-').replace(/;/g, ',').replace(/\n/g, ' ');

            csvContent += '--- AMBIENTE E PARÂMETROS ---\n';
            csvContent += ['Parâmetro', 'Valor'].join(separator) + '\n';
            csvContent += ['Nome do Sistema', safe(s.systemName)].join(separator) + '\n';
            csvContent += ['Nome do Condomínio', safe(s.condoName)].join(separator) + '\n';
            csvContent += ['CNPJ', safe(s.cnpj)].join(separator) + '\n';
            csvContent += ['Endereço', safe(s.address)].join(separator) + '\n';
            csvContent += ['Chave PIX', safe(s.pixKey)].join(separator) + '\n';
            csvContent += ['Beneficiário PIX', safe(s.pixBeneficiary)].join(separator) + '\n';
            csvContent += ['Logotipo URL', safe(s.logotipoUrl)].join(separator) + '\n';
            csvContent += ['Preço do Gás (m³)', s.gasPrice.toString().replace('.', ',')].join(separator) + '\n';
            csvContent += ['Dia Vencimento Padrão', s.dueDay].join(separator) + '\n';
            csvContent += ['Mensagem Global Fatura', safe(s.mensagemGlobalFatura)].join(separator) + '\n';
            csvContent += ['Data do Backup', new Date().toLocaleString('pt-BR')].join(separator) + '\n';
            csvContent += ['Tenant ID', tenantId].join(separator) + '\n\n';

            csvContent += '--- TIPOS DE UNIDADE ---\n';
            csvContent += ['Nome', 'Cota Base (R$)'].join(separator) + '\n';
            (s.unitTypes || []).forEach((t: UnitType) => { csvContent += [t.name, t.baseFee.toFixed(2).replace('.', ',')].join(separator) + '\n'; });
            csvContent += '\n';

            csvContent += '--- SALDOS FINANCEIROS ---\n';
            csvContent += ['Conta', 'Saldo'].join(separator) + '\n';
            csvContent += ['Caixa (Espécie)', b.cash.toFixed(2).replace('.', ',')].join(separator) + '\n';
            csvContent += ['Banco / Corrente', b.bank.toFixed(2).replace('.', ',')].join(separator) + '\n\n';

            csvContent += '--- PERFIS DE ACESSO (RBAC) ---\n';
            csvContent += ['ID', 'Nome', 'Descrição', 'Padrão', 'Permissões'].join(separator) + '\n';
            cloudProfiles.forEach((p: any) => {
                const perms = Object.entries(p.permissions || {}).map(([k, v]) => `${k}:${v}`).join(' | ');
                csvContent += [p.id, safe(p.name), safe(p.description || '-'), p.isDefault ? 'SIM' : 'NÃO', perms].join(separator) + '\n';
            });
            csvContent += '\n';

            csvContent += '--- AUDITORIA DE ACESSO (USUÁRIOS) ---\n';
            csvContent += ['Nome', 'Email', 'Função', 'Perfil ID', 'Unidade Vinculada', 'Vínculos'].join(separator) + '\n';
            cloudUsers.forEach((usr: any) => {
                const vinculosStr = (usr.vinculos || []).map((v: any) => `${v.condominiumId}(${v.role})`).join(' | ');
                csvContent += [safe(usr.name), usr.email, usr.role.toUpperCase(), safe(usr.profileId), safe(usr.unitId), vinculosStr || '-'].join(separator) + '\n';
            });
            csvContent += '\n';

            csvContent += '--- LEITURAS EM ABERTO (ATUAL) ---\n';
            csvContent += ['Unidade', 'Bloco', 'Morador', 'Tipo ID', 'Última Leitura Salva'].join(separator) + '\n';
            u.forEach((unit: Unit) => {
                csvContent += [unit.id, safe(unit.block), safe(unit.ownerName), safe(unit.typeId), unit.currentGasReading.toString().replace('.', ',')].join(separator) + '\n';
            });
            csvContent += '\n';

            csvContent += '--- HISTÓRICO DE APURAÇÕES (MENSAL) ---\n';
            csvContent += ['Ref/Mês', 'Vencimento', 'Unidade', 'L. Anterior', 'L. Atual', 'Consumo (m³)', 'Vlr Gás (R$)', 'Taxas (R$)', 'Total (R$)', 'Dt Pagamento', 'Vlr Pago', 'Status'].join(separator) + '\n';
            h.forEach((record: any) => {
                record.units.forEach((unit: any) => {
                    const type = record.unitTypes.find((t: any) => t.id === unit.typeId);
                    const fixedFees = (type?.baseFee || 0);
                    const consumption = Math.max(0, unit.currentGasReading - unit.lastGasReading);
                    const gasValue = consumption * record.gasPrice;
                    // Usa calculatedTotal (valor calculado pela API, inclui extraFees) como fonte de verdade.
                    // Fallback para fixedFees + gasValue apenas se o snapshot for antigo (sem calculatedTotal).
                    const totalValue = unit.calculatedTotal || (fixedFees + gasValue);
                    csvContent += [record.referenceMonth, record.dueDate || '-', unit.id, unit.lastGasReading.toString().replace('.', ','), unit.currentGasReading.toString().replace('.', ','), consumption.toFixed(2).replace('.', ','), gasValue.toFixed(2).replace('.', ','), fixedFees.toFixed(2).replace('.', ','), totalValue.toFixed(2).replace('.', ','), unit.paymentDate || '-', (unit.amountPaid || 0).toFixed(2).replace('.', ','), unit.status || 'pendente'].join(separator) + '\n';
                });
            });
            csvContent += '\n';

            csvContent += '--- FINANCEIRO ---\n';
            csvContent += ['Tipo', 'Data', 'Descrição', 'Valor (R$)', 'Rubrica', 'Conciliado'].join(separator) + '\n';
            r.forEach((rev: any) => { csvContent += ['RECEITA', rev.date, safe(rev.description), rev.amount.toFixed(2).replace('.', ','), safe(rev.category), rev.conciliated ? 'SIM' : 'NÃO'].join(separator) + '\n'; });
            e.forEach((exp: any) => { csvContent += ['DESPESA', exp.date, safe(exp.description), exp.amount.toFixed(2).replace('.', ','), safe(exp.category), exp.conciliated ? 'SIM' : 'NÃO'].join(separator) + '\n'; });
            csvContent += '\n';

            csvContent += '--- RESUMO DO BACKUP ---\n';
            csvContent += ['Seção', 'Registros'].join(separator) + '\n';
            csvContent += ['Tipos de Unidade', (s.unitTypes || []).length].join(separator) + '\n';
            csvContent += ['Perfis de Acesso', cloudProfiles.length].join(separator) + '\n';
            csvContent += ['Usuários', cloudUsers.length].join(separator) + '\n';
            csvContent += ['Unidades', u.length].join(separator) + '\n';
            csvContent += ['Apurações (Meses)', h.length].join(separator) + '\n';

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const now = new Date().toISOString().split('T')[0];
            link.setAttribute('href', url);
            link.setAttribute('download', `backup_CLOUD_${s.condoName || 'condominio'}_${now}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('Backup gerado com sucesso!', 'success');
        } catch (error) {
            console.error("Erro ao gerar backup:", error);
            showToast("Erro ao conectar com o banco de dados para gerar o backup.", 'error');
        } finally {
            setIsExporting(false);
        }
    };

    if (!canManageSettings) {
        return (
            <div className="w-full animate-in fade-in duration-500 pb-16">
                <HabitaContainer>
                    <HabitaContainerHeader
                        title="Acesso Restrito"
                        subtitle="Segurança de Sistema"
                        icon={<ShieldAlert size={24} />}
                    />
                    <HabitaContainerContent>
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                            <div className="p-6 bg-rose-50 text-rose-600 rounded-3xl border border-rose-100 shadow-sm animate-bounce">
                                <ShieldAlert size={48} />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Privilégios Insuficientes</h1>
                                <p className="text-slate-500 max-w-md font-medium">
                                    Sua conta não possui as permissões necessárias para gerenciar as configurações globais do condomínio.
                                </p>
                            </div>
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
                    title="Configurações"
                    subtitle="Parâmetros de sistema e customização corporativa"
                    icon={<SettingsIcon size={24} />}
                    actions={
                        <div className="flex items-center gap-3">
                            <HabitaButton
                                variant="outline"
                                onClick={handleExportCSV}
                                disabled={isExporting}
                                isLoading={isExporting}
                                icon={<Download size={18} />}
                            >
                                {isExporting ? 'Processando...' : 'Backup (CSV)'}
                            </HabitaButton>
                            <HabitaButton
                                onClick={handleSaveGlobalParams}
                                icon={<Save size={18} />}
                            >
                                Salvar Tudo
                            </HabitaButton>
                        </div>
                    }
                />

                <HabitaContainerContent>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Sidebar - Quick Info & Plan */}
                        <div className="lg:col-span-4 space-y-6">
                            {/* Plan Card */}
                            <HabitaCard className="bg-gradient-to-br from-indigo-600 to-blue-700 border-none text-white overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <ShieldCheck size={120} />
                                </div>
                                <div className="relative p-6 z-10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                            <ShieldCheck size={18} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Plano Ativo</span>
                                    </div>
                                    <h2 className="text-2xl font-black tracking-tight uppercase mb-1">
                                        {plan?.name || (planLoading ? 'Sincronizando...' : 'Configuração Padrão')}
                                    </h2>
                                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Ativado para o Tenant: {tenantId.substring(0, 12)}...</p>

                                    <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase opacity-60">Status de Serviço</span>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                <span className="text-[10px] font-bold">100% Operacional</span>
                                            </div>
                                        </div>
                                        <HabitaButton 
                                            size="sm" 
                                            variant="ghost" 
                                            className="bg-white/10 hover:bg-white/20 border-none text-white"
                                            onClick={handleOpenUpgradeModal}
                                        >
                                            Upgrade
                                        </HabitaButton>
                                    </div>
                                </div>
                            </HabitaCard>

                            {/* Logo Customization */}
                            <HabitaCard>
                                <HabitaCardHeader>
                                    <div className="flex items-center gap-2">
                                        <ImageIcon size={18} className="text-indigo-500" />
                                        <HabitaCardTitle>Identidade Visual</HabitaCardTitle>
                                    </div>
                                </HabitaCardHeader>
                                <div className="flex flex-col items-center text-center space-y-6">
                                    <div className="relative group">
                                        <div className="w-32 h-32 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden group-hover:border-emerald-400 group-hover:bg-emerald-50/30 transition-all duration-500">
                                            {settings?.logotipoUrl ? (
                                                <img src={settings.logotipoUrl} alt="Logo" className="w-full h-full object-contain p-4 drop-shadow-sm" />
                                            ) : (
                                                <div className="flex flex-col items-center text-slate-300">
                                                    <Camera size={32} strokeWidth={1.5} />
                                                    <span className="text-[9px] font-black uppercase mt-2">Sem Logo</span>
                                                </div>
                                            )}
                                            {isUploadingLogo && (
                                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                                    <HabitaSpinner size="md" />
                                                </div>
                                            )}
                                        </div>

                                        {settings.logotipoUrl && !isUploadingLogo && (
                                            <HabitaIconActionButton
                                                icon={<Trash2 />}
                                                variant="danger"
                                                size="sm"
                                                tooltip="Remover Logotipo"
                                                className="absolute -top-2 -right-2 bg-white shadow-lg hover:scale-110 rounded-2xl"
                                                onClick={handleRemoveLogo}
                                            />
                                        )}
                                    </div>

                                    <div className="space-y-4 w-full">
                                        <div className="flex flex-col gap-3 items-center w-full">
                                            <HabitaFileUpload
                                                label={settings?.logotipoUrl ? 'Alterar Logo' : 'Fazer Upload'}
                                                onFilesSelected={async (files) => {
                                                    if (files.length > 0) {
                                                        const file = files[0];
                                                        setIsUploadingLogo(true);
                                                        const logoPath = `condominios/${tenantId}/config/logo`;

                                                        try {
                                                            const downloadUrl = await dbUtils.uploadFile(file, logoPath);
                                                            
                                                            // O updateSettings no backend já cuida de espelhar o logotipoUrl 
                                                            // entre as coleções 'settings' e 'condominios' se estiver no payload.
                                                            await updateSettings({ 
                                                                ...settings, 
                                                                logotipoUrl: downloadUrl 
                                                            });
                                                            
                                                            showToast('Logotipo atualizado com sucesso!', 'success');
                                                        } catch (error: any) {
                                                            console.error("Erro ao fazer upload do logo:", error);
                                                            showToast(error.message || 'Erro ao fazer upload do logotipo.', 'error');
                                                        } finally {
                                                            setIsUploadingLogo(false);
                                                        }
                                                    }
                                                }}
                                                accept="image/*"
                                                isLoading={isUploadingLogo}
                                                description="PNG / JPG • MÁX 500KB"
                                                className="border-none p-0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </HabitaCard>
                        </div>

                        {/* Main Settings Form */}
                        <div className="lg:col-span-8 space-y-8">
                            <HabitaCard>
                                <HabitaCardHeader>
                                    <div className="flex items-center gap-2">
                                        <Layout size={18} className="text-emerald-500" />
                                        <HabitaCardTitle>Dados do Condomínio</HabitaCardTitle>
                                    </div>
                                </HabitaCardHeader>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <HabitaInput
                                        label="Nome do Sistema (Dashboard)"
                                        placeholder="Ex: HabitarPleno"
                                        value={systemNameInput}
                                        onChange={(e) => setSystemNameInput(e.target.value)}
                                        className="font-black text-slate-800"
                                    />
                                    <HabitaInput
                                        label="Razão Social / Identidade"
                                        placeholder="Ex: Condomínio Edifício Solar"
                                        value={condoNameInput}
                                        onChange={(e) => setCondoNameInput(e.target.value)}
                                        className="font-black text-slate-800"
                                    />
                                    <HabitaInput
                                        label="CNPJ"
                                        placeholder="00.000.000/0000-00"
                                        value={cnpjInput}
                                        onChange={(e) => setCnpjInput(e.target.value)}
                                    />
                                    <HabitaInput
                                        label="Endereço Completo"
                                        placeholder="Rua, Número, Bairro, Cidade - UF"
                                        value={addressInput}
                                        onChange={(e) => setAddressInput(e.target.value)}
                                    />
                                    <HabitaInput
                                        label="Preço do Gás (R$ / m³)"
                                        type="number"
                                        step="0.01"
                                        value={gasPriceInput}
                                        onChange={(e) => setGasPriceInput(e.target.value)}
                                        className="font-black text-emerald-600 bg-emerald-50/30 border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500/20"
                                    />
                                    <HabitaInput
                                        label="Vencimento Mensal (Dia)"
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={settings?.dueDay ?? 10}
                                        onChange={(e) => updateSettings({ ...settings, dueDay: Number(e.target.value) })}
                                    />
                                </div>

                                <div className="mt-8 pt-8 border-t border-slate-50 space-y-6">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <CreditCard size={14} className="text-blue-500" />
                                        Configuração de Pagamentos (PIX)
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <HabitaInput
                                            label="Chave PIX"
                                            placeholder="Email, CNPJ ou Chave Aleatória"
                                            value={pixKeyInput}
                                            onChange={(e) => setPixKeyInput(e.target.value)}
                                            className="font-mono text-xs text-blue-600 bg-blue-50/20 border-blue-100"
                                        />
                                        <HabitaInput
                                            label="Nome do Beneficiário"
                                            placeholder="Ex: Condominio Solar Ltda"
                                            value={pixBeneficiaryInput}
                                            onChange={(e) => setPixBeneficiaryInput(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="mt-8 pt-8 border-t border-slate-50">
                                    <HabitaTextarea
                                        label="Comunicado Global (Exibido nos Boletos)"
                                        placeholder="Ex: Caro morador, a próxima assembleia geral será no dia..."
                                        value={globalMessageInput}
                                        onChange={(e) => setGlobalMessageInput(e.target.value.substring(0, 250))}
                                        className="text-sm font-medium h-32"
                                    />
                                    <p className="mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Limite: 250 caracteres • Disponível automaticamente nos PDFs gerados</p>
                                </div>
                            </HabitaCard>

                            <HabitaCard>
                                <HabitaCardHeader>
                                    <div className="flex items-center gap-2">
                                        <Database size={18} className="text-blue-500" />
                                        <HabitaCardTitle>Tipos de Unidade e Cota Base</HabitaCardTitle>
                                    </div>
                                </HabitaCardHeader>
                                <div className="space-y-4">
                                    {(settings?.unitTypes || []).map((type) => {
                                        const isEditing = editingTypeId === type.id;
                                        if (isEditing) {
                                            return (
                                                <div key={type.id} className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-4 items-end animate-in fade-in zoom-in-95 duration-200 shadow-sm">
                                                    <div className="md:col-span-5">
                                                        <HabitaInput
                                                            label="Nome do Tipo"
                                                            value={editTypeName}
                                                            onChange={(e) => setEditTypeName(e.target.value)}
                                                            className="bg-white"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-4">
                                                        <HabitaInput
                                                            label="Cota Base (R$)"
                                                            type="number"
                                                            step="0.01"
                                                            value={editTypeBase}
                                                            onChange={(e) => setEditTypeBase(e.target.value)}
                                                            className="bg-white"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-3 flex gap-2">
                                                        <HabitaIconActionButton 
                                                            icon={<Check />}
                                                            variant="success"
                                                            size="md"
                                                            tooltip="Salvar"
                                                            className="flex-1 bg-white"
                                                            onClick={() => handleSaveEditType(type.id)}
                                                        />
                                                        <HabitaIconActionButton 
                                                            icon={<X />}
                                                            variant="outline"
                                                            size="md"
                                                            tooltip="Cancelar"
                                                            className="flex-1 bg-white"
                                                            onClick={handleCancelEditType}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={type.id} className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl flex items-center justify-center font-black text-xs uppercase group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                                                        {type.name.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-slate-800 text-sm tracking-tight uppercase">{type.name}</h4>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                                            Cota Base: <span className="text-emerald-600">R$ {type.baseFee.toFixed(2)}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <HabitaIconActionButton
                                                        icon={<Pencil />}
                                                        variant="ghost"
                                                        size="sm"
                                                        tooltip="Editar"
                                                        className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                        onClick={() => handleEditType(type)}
                                                    />
                                                    <HabitaIconActionButton
                                                        icon={<Trash2 />}
                                                        variant="ghost"
                                                        size="sm"
                                                        tooltip="Excluir"
                                                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                        onClick={() => handleDeleteType(type.id)}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {(settings?.unitTypes || []).length === 0 && (
                                        <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                                            <Database size={32} className="text-slate-200 mb-2" />
                                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Nenhum tipo de unidade configurado</p>
                                        </div>
                                    )}

                                    {/* Add Form */}
                                    <form onSubmit={handleAddType} className="mt-6 p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 space-y-4">
                                        <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Adicionar Novo Modelo</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                            <div className="md:col-span-5">
                                                <HabitaInput
                                                    label="Nome do Tipo"
                                                    placeholder="Ex: Apartamento Tipo, Garden..."
                                                    value={newTypeName}
                                                    onChange={(e) => setNewTypeName(e.target.value)}
                                                    className="bg-white"
                                                    required
                                                />
                                            </div>
                                            <div className="md:col-span-4">
                                                <HabitaInput
                                                    label="Cota Base (R$)"
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={newTypeBase}
                                                    onChange={(e) => setNewTypeBase(e.target.value)}
                                                    className="bg-white"
                                                    required
                                                />
                                            </div>
                                            <div className="md:col-span-3">
                                                <HabitaButton type="submit" className="w-full h-10" icon={<Plus size={18} />}>
                                                    Adicionar
                                                </HabitaButton>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </HabitaCard>

                            {/* Data Export Card */}
                            <HabitaCard>
                                <HabitaCardHeader>
                                    <div className="flex items-center gap-2">
                                        <Download size={18} className="text-slate-700" />
                                        <HabitaCardTitle>Segurança e Backup</HabitaCardTitle>
                                    </div>
                                </HabitaCardHeader>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex-1 space-y-2">
                                        <p className="text-slate-600 text-xs font-medium leading-relaxed">
                                            Exporte uma cópia de segurança completa de todos os dados do condomínio em formato CSV.
                                            Este arquivo inclui histórico de consumo, financeiro, cadastros e auditoria.
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <HabitaBadge variant="success" size="xs">Seguro</HabitaBadge>
                                            <HabitaBadge variant="indigo" size="xs">Criptografado</HabitaBadge>
                                        </div>
                                    </div>
                                    <HabitaButton
                                        onClick={handleExportCSV}
                                        disabled={isExporting}
                                        className={clsx(
                                            "shrink-0 h-12 px-8 shadow-lg",
                                            isExporting ? "bg-slate-100 text-slate-300" : "bg-slate-900 border-slate-900 text-white hover:bg-black shadow-black/10"
                                        )}
                                        isLoading={isExporting}
                                        icon={<Download size={18} />}
                                    >
                                        Exportar Dados
                                    </HabitaButton>
                                </div>
                            </HabitaCard>
                        </div>
                    </div>
                </HabitaContainerContent>
            </HabitaContainer>

            {/* Confirm Modals */}
            <HabitaModal
                isOpen={showDeleteLogoConfirm}
                onClose={() => setShowDeleteLogoConfirm(false)}
                title="Remover Logotipo"
                size="sm"
                footer={
                    <div className="flex gap-3 w-full">
                        <HabitaButton variant="outline" onClick={() => setShowDeleteLogoConfirm(false)} className="flex-1">Cancelar</HabitaButton>
                        <HabitaButton variant="danger" onClick={confirmRemoveLogo} className="flex-1">Confirmar Remoção</HabitaButton>
                    </div>
                }
            >
                <div className="py-4 text-center space-y-4">
                    <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto border border-rose-100 shadow-sm mb-4">
                        <Trash2 size={32} />
                    </div>
                    <p className="text-slate-600 font-medium">Deseja remover o logotipo atual? Esta ação não pode ser desfeita.</p>
                </div>
            </HabitaModal>

            <HabitaModal
                isOpen={showDeleteTypeConfirm.isOpen}
                onClose={() => setShowDeleteTypeConfirm({ isOpen: false, typeId: null })}
                title="Excluir Tipo de Unidade"
                size="sm"
                footer={
                    <div className="flex gap-3 w-full">
                        <HabitaButton variant="outline" onClick={() => setShowDeleteTypeConfirm({ isOpen: false, typeId: null })} className="flex-1">Cancelar</HabitaButton>
                        <HabitaButton variant="danger" onClick={confirmDeleteType} className="flex-1">Excluir Tipo</HabitaButton>
                    </div>
                }
            >
                <div className="py-4 text-center space-y-4">
                    <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto border border-rose-100 shadow-sm mb-4">
                        <Database size={32} />
                    </div>
                    <p className="text-slate-600 font-medium leading-relaxed">
                        Tem certeza que deseja excluir este tipo?<br/>
                        <span className="text-rose-500 text-xs font-bold uppercase tracking-wider">Unidades vinculadas podem ficar sem cota associada.</span>
                    </p>
                </div>
            </HabitaModal>

            {/* Upgrade Plan Modal */}
            <HabitaModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                title="Upgrade do Plano HabitarPleno"
                size="xl"
            >
                <div className="py-2 space-y-8">
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Escolha a melhor escala para seu condomínio</h3>
                        <p className="text-sm text-slate-500 font-medium">Libere recursos avançados, maior armazenamento e suporte prioritário.</p>
                    </div>

                    {isLoadingPlans ? (
                        <div className="py-20 flex flex-col items-center justify-center space-y-4">
                            <HabitaSpinner size="lg" variant="primary" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando ofertas disponíveis...</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {availablePlans.map((p) => {
                                const isCurrent = p.id === plan?.id;
                                const isBestValue = p.name.toLowerCase().includes('pro') || p.name.toLowerCase().includes('pleno');
                                
                                // Determinar ícone baseado no nome
                                let PlanIcon = Zap;
                                let planColor = "indigo";
                                if (p.name.toLowerCase().includes('base') || p.name.toLowerCase().includes('light')) {
                                    PlanIcon = Rocket;
                                    planColor = "slate";
                                } else if (p.name.toLowerCase().includes('pro') || p.name.toLowerCase().includes('plus')) {
                                    PlanIcon = Star;
                                    planColor = "emerald";
                                } else if (p.name.toLowerCase().includes('master') || p.name.toLowerCase().includes('enterprise')) {
                                    PlanIcon = Crown;
                                    planColor = "amber";
                                }

                                return (
                                    <div 
                                        key={p.id}
                                        className={clsx(
                                            "relative group p-6 rounded-[2.5rem] border-2 transition-all duration-500 flex flex-col h-full",
                                            isCurrent 
                                                ? "border-indigo-600 bg-indigo-50/30 ring-4 ring-indigo-500/10 scale-[1.02]" 
                                                : isBestValue 
                                                    ? "border-slate-200 hover:border-emerald-400 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1 bg-white" 
                                                    : "border-slate-100 hover:border-slate-300 hover:bg-slate-50/50 bg-white"
                                        )}
                                    >
                                        {isBestValue && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-500/20 z-10">
                                                <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Melhor Escolha</span>
                                            </div>
                                        )}

                                        <div className="flex flex-col flex-1">
                                            <div className={clsx(
                                                "w-14 h-14 rounded-3xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-sm",
                                                planColor === 'indigo' ? "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white" :
                                                planColor === 'emerald' ? "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white" :
                                                planColor === 'amber' ? "bg-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white" :
                                                "bg-slate-100 text-slate-600 group-hover:bg-slate-800 group-hover:text-white"
                                            )}>
                                                <PlanIcon size={28} />
                                            </div>

                                            <h4 className="text-2xl font-black text-slate-800 tracking-tighter uppercase mb-1">{p.name}</h4>
                                            <p className="text-slate-500 text-xs font-medium mb-6 line-clamp-2">{p.description || "Recursos completos para sua gestão."}</p>

                                            <div className="mb-8">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-3xl font-black text-slate-900 tracking-tighter">
                                                        {p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </span>
                                                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">/ mês</span>
                                                </div>
                                            </div>

                                            <div className="space-y-3 mb-8 flex-1">
                                                {p.modules.slice(0, 5).map((mod) => (
                                                    <div key={mod} className="flex items-center gap-2 text-slate-600 group-hover:text-slate-900 transition-colors">
                                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                                        <span className="text-[11px] font-bold uppercase tracking-wider">{mod.replace('_', ' ')}</span>
                                                    </div>
                                                ))}
                                                {p.modules.length > 5 && (
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-6">+{p.modules.length - 5} módulos extras</span>
                                                )}
                                            </div>

                                            <HabitaButton
                                                className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs"
                                                variant={isCurrent ? "outline" : isBestValue ? "primary" : "secondary"}
                                                disabled={isCurrent || (isUpgradingPlan !== null)}
                                                isLoading={isUpgradingPlan === p.id}
                                                onClick={() => handleSelectPlan(p.id)}
                                            >
                                                {isCurrent ? "Plano Atual" : "Selecionar Plano"}
                                            </HabitaButton>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 text-slate-500">
                        <ShieldCheck size={20} className="text-indigo-500 shrink-0" />
                        <p className="text-[10px] font-medium leading-relaxed">
                            A alteração de plano será processada e refletida na sua próxima fatura. 
                            Os novos módulos e limites serão liberados imediatamente após a confirmação do sistema.
                            Caso precise de um plano customizado para grandes condomínios, <span className="text-indigo-600 font-bold cursor-pointer hover:underline">fale com nosso suporte</span>.
                        </p>
                    </div>
                </div>
            </HabitaModal>
        </div>
    );
};

export default SettingsPage;
