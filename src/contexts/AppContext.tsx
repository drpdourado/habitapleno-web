import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';
import { systemService } from '../services/SystemService';
import { useAuth } from './AuthContext';

/**
 * Shared entity types for the entire Hub application.
 */
export interface UnitType { id: string; name: string; baseFee: number;[key: string]: any; }
export interface Category { id: string; name: string; type: 'income' | 'expense'; }
export interface Unit {
  id: string; 
  ownerName: string; 
  ownerEmail?: string;
  ownerContact?: string;
  ownerId?: string;
  residentType?: 'owner' | 'tenant';
  tenantName?: string;
  tenantEmail?: string;
  tenantId?: string;
  typeId: string; 
  lastGasReading: number; 
  currentGasReading: number; 
  status?: string; 
  paymentDate?: string;
  [key: string]: any; 
}
export interface Setting { condoName: string; currentRefMonth: string; gasPrice: number; dueDay: number; unitTypes: UnitType[];[key: string]: any; }
export interface Ocorrencia { id: string; titulo: string; categoria: string; status: 'Pendente' | 'Resolvida' | string; dataAbertura: string; dataResolucao?: string; prioridade?: 'Baixa' | 'Media' | 'Alta' | string; unitId?: string; [key: string]: any; }
export interface Area { id: string; nome: string; capacidade: number; status: 'ativo' | 'inativo' | 'manutencao';[key: string]: any; }
export interface Reserva { id: string; areaId: string; data: string; unitId: string;[key: string]: any; }
export interface Expense { id: string; description?: string; amount: number; date: string; category: string;[key: string]: any; }
export interface HistoryRecord {
  id: string;
  referenceMonth: string;
  dueDate: string;
  closedAt?: string;
  gasPrice: number;
  totalExpenses: number;
  totalIncomes: number;
  units?: Unit[];
  unitTypes?: UnitType[];
  extraFees?: ExtraFee[];
  [key: string]: any;
}
export interface ExtraFeeValue {
  unitTypeId: string;
  value: number;
}
export interface ExtraFee {
  id: string;
  name: string;
  type: 'recurring' | 'installment';
  status: 'active' | 'paused' | 'finished';
  values: ExtraFeeValue[];
  totalInstallments?: number;
  currentInstallment?: number;
  isReserveFund?: boolean;
  createdAt?: string;
  condominiumId?: string;
}
export interface Revenue { id: string; description?: string; amount: number; date: string; category: string;[key: string]: any; }
export interface CondoDocument {
  id: string;
  title: string;
  description?: string;
  category: 'ata' | 'regimento' | 'aviso' | 'outro';
  fileUrl: string;
  fileName: string;
  createdAt: string;
}

export interface BuildingImprovement {
  id: string;
  title: string;
  date: string;
  amount: number;
  description: string;
  photoUrls?: string[];
  documentUrl?: string;
  createdAt: string;
}


export interface MuralNotice {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  type: 'urgent' | 'info' | 'event';
  expiryDate?: string | null;
  authorName: string;
  authorId: string;
  date: string;
  readBy: string[];
  isArchived: boolean;
  status: 'pending' | 'approved' | 'rejected' | string;
}

export interface Manutencao {
  id: string;
  titulo: string;
  frequenciaValor: number;
  frequenciaUnidade: 'dias' | 'meses' | 'anos';
  ultimaRealizacao: string;
  proximaData: string;
  status?: string;
  statusBadge?: 'success' | 'warning' | 'error';
}

export interface BankAccount {
  id: string;
  name: string;
  type: 'corrente' | 'poupanca' | 'investimento' | string;
  status: 'ativa' | 'inativa' | string;
  initialBalance: number;
  currentBalance: number;
}

export interface AppContextType {
  // --- Status & Identity ---
  isLoading: boolean;
  error: string | null;
  tenantId: string;
  settings: Setting;

  // --- Data Collections ---
  units: Unit[];
  visibleUnits: Unit[];
  accessControl: any[];
  visibleHistory: HistoryRecord[];
  history: HistoryRecord[]; // Alias
  extraFees: ExtraFee[];
  expenses: Expense[];
  revenues: Revenue[];
  virtualRevenues: Revenue[]; // New
  notices: MuralNotice[];
  packages: any[];
  balances: any;
  manutencoes: any[];
  closures: any[];
  bankAccounts: BankAccount[];
  areas: Area[];
  reservas: Reserva[];
  ocorrencias: Ocorrencia[];
  visibleOcorrencias: Ocorrencia[];
  reconciliationPool: any[];
  documents: CondoDocument[];
  improvements: BuildingImprovement[];
  visiblePackages: any[];
  dashboardStats: any;
  periodStatus: { [key: string]: string };
  categories: any[];
  users: any[];
  profiles: any[];
  gasTrends: {
    unitAverages: { [key: string]: number };
    lastReadings: { [key: string]: number };
  };



  // --- Operations / Mutations ---
  reloadCondoData: () => Promise<void>;
  updateSettings: (newSettings: any) => Promise<void>;
  getUnitType: (id: string) => any;
  bulkAddUnits: (units: any[]) => Promise<void>;

  // Modules: Financial
  confirmUnitPayment: (recordId: string | null, unitId: string, amount: number, paymentDate: string) => Promise<void>;
  addExpense: (data: any) => Promise<void>;
  addRevenue: (data: any) => Promise<void>;
  bulkUpdateExpenses: (items: any[]) => Promise<void>;
  bulkUpdateRevenues: (items: any[]) => Promise<void>;
  updateHistoryRecord: (id: string, data: any) => Promise<void>;
  deleteHistoryRecord: (id: string) => Promise<void>;
  closeMonth: (month: string, data?: any) => Promise<void>;
  addMonthClosure: (data: any) => Promise<void>; // New
  deleteMonthClosure: (id: string) => Promise<void>; // New
  initNewMonth: (month: string) => Promise<void>;
  isMonthClosed: (refMonth: string) => boolean; // New

  // Modules: Ocorrencias
  addOcorrencia: (oc: Ocorrencia) => Promise<void>;
  updateOcorrencia: (oc: Ocorrencia) => Promise<void>;
  deleteOcorrencia: (id: string) => Promise<void>;

  // Modules: Reservas
  addReserva: (res: Reserva) => Promise<void>;
  updateReserva: (res: Reserva) => Promise<void>;
  switchTenant: (id: string) => void;
  switchEnvironment: (id: string) => void;


  // Modules: Alerts/Mural
  markNoticeAsRead: (id: string, userId: string) => Promise<void>;
  addManutencao: (m: any) => Promise<void>;

  // Extra Fees
  addExtraFee: (fee: ExtraFee) => Promise<void>;
  updateExtraFee: (fee: ExtraFee) => Promise<void>;
  deleteExtraFee: (id: string) => Promise<void>;
  toggleExtraFeeStatus: (id: string, status: string) => Promise<void>;

  // Additional Operations
  addArea: (a: any) => Promise<void>;
  updateArea: (a: any) => Promise<void>;
  deleteArea: (id: string) => Promise<void>;
  addNotice: (n: any) => Promise<void>;
  updateNotice: (n: any) => Promise<void>;
  deleteNotice: (id: string) => Promise<void>;
  addBankAccount: (b: any) => Promise<void>;
  updateBankAccount: (b: any) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<void>;
  updateManutencao: (m: any) => Promise<void>;
  deleteManutencao: (id: string) => Promise<void>;
  concluirManutencao: (id: string, data: any) => Promise<void>;
  saveCurrentReading: (unitId: string, reading: any) => Promise<void>;
  saveHistoryRecord: (data: any) => Promise<void>;
  addDocument: (doc: CondoDocument) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  addImprovement: (data: BuildingImprovement) => Promise<void>;
  updateImprovement: (data: BuildingImprovement) => Promise<void>;
  deleteImprovement: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState("");
  const [settings, setSettings] = useState<Setting>({
    condoName: "HabitarPleno",
    currentRefMonth: "",
    gasPrice: 0,
    dueDay: 10,
    unitTypes: []
  });

  // Data Collections (Legacy Bridge with API synchronization)
  const [visibleUnits, setVisibleUnits] = useState<Unit[]>([]);
  const [visibleHistory, setVisibleHistory] = useState<any[]>([]);
  const [extraFees, setExtraFees] = useState<ExtraFee[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [revenues, setRevenues] = useState<any[]>([]);
  const [notices, setNotices] = useState<MuralNotice[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [balances, setBalances] = useState<any>({});
  const [manutencoes, setManutencoes] = useState<any[]>([]);
  const [closures, setClosures] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [visibleOcorrencias, setVisibleOcorrencias] = useState<Ocorrencia[]>([]);
  const [reconciliationPool, setReconciliationPool] = useState<any[]>([]);
  const [documents, setDocuments] = useState<CondoDocument[]>([]);
  const [improvements, setImprovements] = useState<BuildingImprovement[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>({});
  const [virtualRevenues, setVirtualRevenues] = useState<any[]>([]);
  const [periodStatus, setPeriodStatus] = useState<{ [key: string]: string }>({});
  const [categories, setCategories] = useState<any[]>([]);
  const [accessControl, setAccessControl] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [gasTrends, setGasTrends] = useState<any>({ unitAverages: {}, lastReadings: {} });

  const { user } = useAuth();


  const reloadCondoData = useCallback(async () => {
    const condoId = localStorage.getItem('@HabitarPleno:activeCondoId');
    if (!condoId) return;

    try {
      setError(null);
      const response = await systemService.reloadCondoData();
      if (response.success && response.data) {
        const d = response.data;
        setSettings(prev => d.settings || prev);
        setVisibleUnits(d.units || []);
        setVisibleHistory(d.history || []);
        setExtraFees(d.extraFees || []);
        setRevenues(d.revenues || []);
        setNotices(d.notices || []);
        setPackages(d.packages || []);
        setBalances(d.balances || {});
        setManutencoes(d.manutencoes || []);
        setClosures(d.closures || []);
        setBankAccounts(d.bankAccounts || []);
        setAreas(d.areas || []);
        setReservas(d.reservas || []);
        setVisibleOcorrencias(d.ocorrencias || []);
        setReconciliationPool(d.reconciliationPool || []);
        setDocuments(d.documents || []);
        setImprovements(d.improvements || []);
        setDashboardStats(d.dashboardStats || {});

        setVirtualRevenues(d.virtualRevenues || []);
        setExpenses([...(d.expenses || []), ...(d.virtualExpenses || [])]);
        setPeriodStatus(d.periodStatus || {});
        setCategories(d.categories || []);
        setAccessControl(d.accessControl || []);
        setUsers(d.users || []);
        setProfiles(d.profiles || []);
        setGasTrends(d.gasTrends || { unitAverages: {}, lastReadings: {} });


        setError(null);
      } else {
        setError(response.error || "Ambiente ainda não configurado.");
      }
    } catch (err: any) {
      console.error("API Sync error:", err);
      setError(err.message || "Erro ao sincronizar dados do servidor");
    }

  }, [setError]);

  useEffect(() => {
    const condoId = localStorage.getItem('@HabitarPleno:activeCondoId');
    const token = localStorage.getItem('@HabitarPleno:token');

    if (token && condoId) {
      setTenantId(condoId);
      setIsLoading(true);
      reloadCondoData().finally(() => setIsLoading(false));
    } else {
      setTenantId("");
      setIsLoading(false);
    }
  }, [reloadCondoData, user]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).appContext = {
        visibleUnits, settings, history: visibleHistory, virtualRevenues: [], expenses,
        revenues, notices, packages, balances, manutencoes,
        closures, bankAccounts, areas, reservas, visibleOcorrencias,
        gasTrends,
        reloadCondoData
      };
    }
  }, [visibleUnits, settings, visibleHistory, expenses, revenues, notices, packages, balances, manutencoes, closures, bankAccounts, areas, reservas, visibleOcorrencias, reloadCondoData]);

  // --- Implementation of Abstract Operation Methods ---

  const getUnitType = (id: string) => settings.unitTypes?.find(t => t.id === id);

  const updateSettings = async (newS: any) => {
    await api.put('/condo/settings', newS);
    await reloadCondoData();
  };

  const bulkAddUnits = async (u: any[]) => {
    await api.post('/units/bulk', { units: u }); // Esse endpoint precisa existir no backend
    await reloadCondoData();
  };

  const confirmUnitPayment = async (recordId: string | null, unitId: string, amount: number, paymentDate: string) => {
    // No Node, o pagamento é via PDF ou via registro no histórico (revenues)
    await api.post(`/units/${unitId}/pay`, { recordId, amount, paymentDate });
    await reloadCondoData();
  };

  const addOcorrencia = async (oc: Ocorrencia) => {
    await api.post('/condo/tickets', oc);
    await reloadCondoData();
  };

  const updateOcorrencia = async (oc: Ocorrencia) => {
    await api.put(`/condo/tickets/${oc.id}`, oc);
    await reloadCondoData();
  };

  const deleteOcorrencia = async (id: string) => {
    await api.delete(`/condo/tickets/${id}`);
    await reloadCondoData();
  };

  const addReserva = async (res: Reserva) => {
    await api.post('/condo/reservas', res); // Endpoint legado no condoController se existir
    await reloadCondoData();
  };

  const updateReserva = async (res: Reserva) => {
    await api.put(`/condo/reservas/${res.id}`, res);
    await reloadCondoData();
  };

  const markNoticeAsRead = async (id: string, userId: string) => {
    await api.put(`/condo/mural/${id}/read`, { userId });
    await reloadCondoData();
  };

  const addManutencao = async (m: any) => {
    await api.post('/manutencoes', m);
    await reloadCondoData();
  };

  const closeMonth = async (month: string, d: any = {}) => {
    await api.post('/financial/close-month', { month, ...d });
    await reloadCondoData();
  };

  const deleteMonthClosure = async (id: string) => {
    await api.delete(`/financial/closures/${id}`);
    await reloadCondoData();
  };

  const isMonthClosed = (refMonth: string) => {
    if (!refMonth) return false;
    // Format can be MM/YYYY (from readings) or MM-YYYY (from closures page)
    const normalized = refMonth.replace('/', '-');
    return closures.some(c => c.referenceMonth === refMonth || c.id === refMonth || c.id === normalized);
  };

  const deleteHistoryRecord = async (id: string) => {
    await api.delete(`/history/${id}`);
    await reloadCondoData();
  };

  const initNewMonth = async (month: string) => {
    await api.post('/financial/init-month', { month });
    await reloadCondoData();
  };

  const value = {
    isLoading, error, tenantId, settings,
    visibleUnits, units: visibleUnits, visibleHistory, history: visibleHistory, extraFees, expenses, revenues,
    virtualRevenues, notices,
    packages, visiblePackages: packages, accessControl, 
    users, profiles,
    balances, manutencoes, closures, bankAccounts, areas, reservas,
    reconciliationPool,
    documents,
    improvements,
    ocorrencias: visibleOcorrencias,
    visibleOcorrencias,
    dashboardStats,
    periodStatus,
    categories,
    gasTrends,
    reloadCondoData, updateSettings, getUnitType, bulkAddUnits,
    confirmUnitPayment, closeMonth, initNewMonth,
    addMonthClosure: async () => { await reloadCondoData(); },
    deleteMonthClosure,
    isMonthClosed,
    addOcorrencia, updateOcorrencia, deleteOcorrencia,
    addReserva, updateReserva,
    markNoticeAsRead, addManutencao,
    addExpense: async (d: any) => { await api.post('/financial/expenses', d); await reloadCondoData(); },
    addRevenue: async (d: any) => { await api.post('/financial/revenues', d); await reloadCondoData(); },
    bulkUpdateExpenses: async (items: any[]) => { await api.put('/financial/expenses/bulk', { items }); await reloadCondoData(); },
    bulkUpdateRevenues: async (items: any[]) => { await api.put('/financial/revenues/bulk', { items }); await reloadCondoData(); },
    updateHistoryRecord: async (id: string, d: any) => { await api.put(`/history/${id}`, d); await reloadCondoData(); },
    addExtraFee: async (f: ExtraFee) => { await api.post('/financial/extra-fees', f); await reloadCondoData(); },
    updateExtraFee: async (f: ExtraFee) => { await api.put(`/financial/extra-fees/${f.id}`, f); await reloadCondoData(); },
    deleteExtraFee: async (id: string) => { await api.delete(`/financial/extra-fees/${id}`); await reloadCondoData(); },
    toggleExtraFeeStatus: async (id: string, status: string) => { await api.patch(`/financial/extra-fees/${id}/status`, { status }); await reloadCondoData(); },
    deleteHistoryRecord,
    addDocument: async (doc: CondoDocument) => { await api.post('/condo/documents', doc); await reloadCondoData(); },
    deleteDocument: async (id: string) => { await api.delete(`/condo/documents/${id}`); await reloadCondoData(); },
    addImprovement: async (data: BuildingImprovement) => { await api.post('/condo/improvements', data); await reloadCondoData(); },
    updateImprovement: async (data: BuildingImprovement) => { await api.put(`/condo/improvements/${data.id}`, data); await reloadCondoData(); },
    deleteImprovement: async (id: string) => { await api.delete(`/condo/improvements/${id}`); await reloadCondoData(); },
    addArea: async (a: any) => { await api.post('/areas', a); await reloadCondoData(); },
    updateArea: async (a: any) => { await api.put(`/areas/${a.id}`, a); await reloadCondoData(); },
    deleteArea: async (id: string) => { await api.delete(`/areas/${id}`); await reloadCondoData(); },
    addNotice: async (n: any) => { await api.post('/condo/mural', n); await reloadCondoData(); },
    updateNotice: async (n: any) => { await api.put(`/condo/mural/${n.id}`, n); await reloadCondoData(); },
    deleteNotice: async (id: string) => { await api.delete(`/condo/mural/${id}`); await reloadCondoData(); },
    addBankAccount: async (b: any) => { await api.post('/financial/bank-accounts', b); await reloadCondoData(); },
    updateBankAccount: async (b: any) => { await api.put(`/financial/bank-accounts/${b.id}`, b); await reloadCondoData(); },
    deleteBankAccount: async (id: string) => { await api.delete(`/financial/bank-accounts/${id}`); await reloadCondoData(); },
    updateManutencao: async (m: any) => { await api.put(`/manutencoes/${m.id}`, m); await reloadCondoData(); },
    deleteManutencao: async (id: string) => { await api.delete(`/manutencoes/${id}`); await reloadCondoData(); },
    concluirManutencao: async (id: string, d: any) => { await api.post(`/manutencoes/${id}/concluir`, d); await reloadCondoData(); },
    saveCurrentReading: async (id: string, r: any) => { await api.post(`/units/${id}/reading`, r); await reloadCondoData(); },
    saveHistoryRecord: async (d: any) => { await api.post('/history', d); await reloadCondoData(); },
    switchTenant: (id: string) => {
      localStorage.setItem('@HabitarPleno:activeCondoId', id);
      window.location.reload();
    },
    switchEnvironment: (_id: string) => {
      // Mock for now or implement if backend supports it

    }
  };


  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp deve ser usado dentro de um AppProvider');
  }
  return context;
};
