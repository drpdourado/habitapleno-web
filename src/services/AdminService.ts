// src/services/AdminService.ts
import api from './api';

export const adminService = {
    isMonthClosed: (id: string, closures: any[]) => {
        if (!id || !closures) return false;
        return closures.some(c => c.id === id || c.referenceMonth === id.replace('-', '/'));
    },

    calculateProjectedBalance: (monthInd: number, year: number, expenses: any[], revenues: any[], virtualRevenues: any[], closures: any[], history: any[]) => {
        // Agora o cálculo principal é feito na API (/financial?month=XX&year=YYYY).
        const monthNum = monthInd + 1;
        const monthStrStr = monthNum.toString().padStart(2, '0');
        const closureId = `${monthStrStr}-${year}`;
        
        const existingClosure = (closures || []).find(c => c.id === closureId);
        if (existingClosure) {
            return {
                totalIncomes: Number(existingClosure.totalIncomes || 0),
                totalExpenses: Number(existingClosure.totalExpenses || 0),
                monthBalance: Number(existingClosure.totalIncomes || 0) - Number(existingClosure.totalExpenses || 0),
                initialBalance: Number(existingClosure.initialBalance || 0),
                projectedBalance: Number(existingClosure.finalBalance || 0),
                isClosed: true
            };
        }

        // Fallback básico para exibição imediata antes do load da API
        const totalRevenues = (revenues || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        const totalExpenses = (expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        
        return {
            totalIncomes: totalRevenues,
            totalExpenses,
            monthBalance: totalRevenues - totalExpenses,
            initialBalance: 0, 
            projectedBalance: totalRevenues - totalExpenses,
            hasGasSnapshot: (history || []).some(h => h.referenceMonth === `${monthStrStr}/${year}`),
            isClosed: false
        };
    },

    createMonthSnapshot: async (data: any, balanceResult?: any) => {
        try {
            const payload = balanceResult ? { ...data, ...balanceResult } : data;
            const res = await api.post('/financial/close-month', payload);
            return { success: true, data: res.data };
        } catch (err: any) {
            return { success: false, error: err.response?.data?.message || 'Erro ao processar snapshot' };
        }
    },

    deleteMonthSnapshot: async (id: string) => {
        try {
            const res = await api.delete(`/financial/closures/${id}`);
            return { success: true, data: res.data };
        } catch (err: any) {
            return { success: false, error: err.response?.data?.message || 'Erro ao excluir snapshot' };
        }
    },

    prepareUnitConciliation: (data: any) => {
        // Logic for reconciling unit payments
        return data.map((unit: any) => ({
            ...unit,
            reconciled: !!unit.bankTransactionId
        }));
    }
};

export default adminService;
